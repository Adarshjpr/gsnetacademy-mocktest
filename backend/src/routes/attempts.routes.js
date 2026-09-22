import { Router } from 'express';
import mongoose from 'mongoose';
import Attempt from '../models/Attempt.js';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { authenticate } from '../middleware/auth.js';
import { assertObjectId } from '../utils/validators.js';
import {
  EXPIRY_GRACE_MS,
  ensureFresh,
  finalizeAttempt,
  getLeaderboard,
  isExpired,
  rankForAttempt,
} from '../services/attempt.service.js';

const router = Router();
router.use(authenticate);

const isOwner = (attempt, user) => String(attempt.userId) === String(user._id);

async function loadAttempt(req, { ownerOnly = false } = {}) {
  assertObjectId(req.params.id, 'attempt id');
  const attempt = await Attempt.findById(req.params.id);
  // 404 (not 403) so attempt ids of other users are not confirmed
  if (!attempt) throw new AppError(404, 'Attempt not found');
  const owner = isOwner(attempt, req.user);
  if (!owner && (ownerOnly || req.user.role !== 'ADMIN')) throw new AppError(404, 'Attempt not found');
  return attempt;
}

/** Questions WITHOUT correctAnswer / explanation — safe to send during an exam. */
async function buildExamPayload(attempt) {
  const [test, qs] = await Promise.all([
    Test.findById(attempt.testId).select('title language subject exam duration').lean(),
    Question.find({ _id: { $in: attempt.questionIds } }).select('question options').lean(),
  ]);
  const byId = new Map(qs.map((q) => [String(q._id), q]));
  const questions = attempt.questionIds
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((q) => ({ id: q._id, question: q.question, options: q.options }));

  return {
    mode: 'exam',
    serverNow: new Date(),
    attempt: {
      id: attempt._id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      answers: attempt.answers.map((a) => ({
        questionId: a.questionId,
        selectedAnswer: a.selectedAnswer,
        markedForReview: a.markedForReview,
        visited: a.visited,
      })),
    },
    test: {
      id: attempt.testId,
      title: test?.title || 'Test',
      language: test?.language || 'BILINGUAL',
      subject: test?.subject || '',
      exam: test?.exam || '',
      duration: test?.duration || 0,
      marksPerQuestion: attempt.marksPerQuestion,
      negativeMarking: attempt.negativeMarking,
      totalMarks: attempt.totalMarks,
      totalQuestions: questions.length,
    },
    questions,
  };
}

function attemptSummary(a) {
  return {
    id: a._id,
    status: a.status,
    startedAt: a.startedAt,
    expiresAt: a.expiresAt,
    submittedAt: a.submittedAt,
    timeTaken: a.timeTaken,
    autoSubmitted: a.autoSubmitted,
    score: a.score,
    totalMarks: a.totalMarks,
    percentage: a.percentage,
    accuracy: a.accuracy,
    correctCount: a.correctCount,
    wrongCount: a.wrongCount,
    unattemptedCount: a.unattemptedCount,
    totalQuestions: (a.questionIds || []).length,
    marksPerQuestion: a.marksPerQuestion,
    negativeMarking: a.negativeMarking,
  };
}

async function buildResultPayload(attempt) {
  const [test, user, board] = await Promise.all([
    Test.findById(attempt.testId).select('title subject exam category').lean(),
    User.findById(attempt.userId).select('username name').lean(),
    getLeaderboard(attempt.testId),
  ]);
  return {
    mode: 'result',
    attempt: attemptSummary(attempt),
    test: test
      ? { id: test._id, title: test.title, subject: test.subject, exam: test.exam, category: test.category }
      : { id: attempt.testId, title: 'Deleted test' },
    user: { id: attempt.userId, username: user?.username || 'unknown' },
    rank: rankForAttempt(attempt, board),
    totalParticipants: board.length,
  };
}

/** Start a new attempt, or resume the running one */
router.post(
  '/start',
  asyncHandler(async (req, res) => {
    const { testId } = req.body || {};
    assertObjectId(testId, 'test id');
    const test = await Test.findById(testId).lean();
    const allowed = test && (test.status === 'PUBLISHED' || (req.user.role === 'ADMIN' && test.status !== 'ARCHIVED'));
    if (!allowed) throw new AppError(404, 'Test not found or not available');
    if (!test.questionIds.length) throw new AppError(400, 'This test has no questions yet');

    let existing = await Attempt.findOne({ userId: req.user._id, testId: test._id, status: 'IN_PROGRESS' });
    existing = await ensureFresh(existing);
    if (existing && existing.status === 'IN_PROGRESS') {
      return res.json({ success: true, resumed: true, ...(await buildExamPayload(existing)) });
    }

    const now = new Date();
    try {
      const attempt = await Attempt.create({
        userId: req.user._id,
        testId: test._id,
        status: 'IN_PROGRESS',
        startedAt: now,
        expiresAt: new Date(now.getTime() + test.duration * 60 * 1000),
        questionIds: test.questionIds,
        answers: test.questionIds.map((qid) => ({ questionId: qid })),
        marksPerQuestion: test.marksPerQuestion,
        negativeMarking: test.negativeMarking,
        totalMarks: Math.round(test.questionIds.length * test.marksPerQuestion * 100) / 100,
      });
      res.status(201).json({ success: true, resumed: false, ...(await buildExamPayload(attempt)) });
    } catch (err) {
      if (err.code === 11000) {
        // Two "start" requests raced — return the one that won
        const running = await Attempt.findOne({ userId: req.user._id, testId: test._id, status: 'IN_PROGRESS' });
        if (running) return res.json({ success: true, resumed: true, ...(await buildExamPayload(running)) });
      }
      throw err;
    }
  })
);

/** Current user's attempts (My Tests) */
router.get(
  '/my',
  asyncHandler(async (req, res) => {
    const stale = await Attempt.find({
      userId: req.user._id,
      status: 'IN_PROGRESS',
      expiresAt: { $lt: new Date(Date.now() - EXPIRY_GRACE_MS) },
    }).select('_id');
    for (const s of stale) await finalizeAttempt(s._id, { auto: true });

    const attempts = await Attempt.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(300)
      .populate('testId', 'title subject exam category')
      .lean();

    const boards = new Map();
    const out = [];
    for (const a of attempts) {
      const tid = String(a.testId?._id || a.testId);
      let rank = null;
      let totalParticipants = null;
      if (a.status === 'SUBMITTED') {
        if (!boards.has(tid)) boards.set(tid, await getLeaderboard(tid));
        const board = boards.get(tid);
        rank = rankForAttempt(a, board);
        totalParticipants = board.length;
      }
      out.push({
        ...attemptSummary(a),
        test: a.testId?._id
          ? { id: a.testId._id, title: a.testId.title, subject: a.testId.subject, exam: a.testId.exam, category: a.testId.category }
          : { id: a.testId, title: 'Deleted test' },
        rank,
        totalParticipants,
      });
    }
    res.json({ success: true, attempts: out });
  })
);

/** Exam payload while running, result once submitted */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    let attempt = await loadAttempt(req);
    attempt = await ensureFresh(attempt);
    if (attempt.status === 'IN_PROGRESS') {
      if (!isOwner(attempt, req.user)) {
        return res.json({ success: true, mode: 'in-progress', attempt: attemptSummary(attempt) });
      }
      return res.json({ success: true, ...(await buildExamPayload(attempt)) });
    }
    res.json({ success: true, ...(await buildResultPayload(attempt)) });
  })
);

/** Autosave one answer / review mark / visited flag */
router.post(
  '/:id/answer',
  asyncHandler(async (req, res) => {
    const attempt = await loadAttempt(req, { ownerOnly: true });
    if (attempt.status !== 'IN_PROGRESS') {
      throw new AppError(409, 'This test has already been submitted', { code: 'ATTEMPT_SUBMITTED' });
    }
    if (isExpired(attempt)) {
      await finalizeAttempt(attempt._id, { auto: true });
      throw new AppError(409, 'Time is over. Your test was submitted automatically', { code: 'ATTEMPT_EXPIRED' });
    }

    const { questionId, selectedAnswer, markedForReview, visited } = req.body || {};
    assertObjectId(questionId, 'question id');
    if (!attempt.questionIds.some((id) => String(id) === String(questionId))) {
      throw new AppError(400, 'This question is not part of the attempt');
    }

    // The answers array is fixed when the attempt starts, so we update by index.
    // The filter re-checks the questionId at that index, keeping the write safe and atomic.
    const idx = attempt.answers.findIndex((a) => String(a.questionId) === String(questionId));
    if (idx < 0) throw new AppError(400, 'This question is not part of the attempt');
    const path = `answers.${idx}`;

    const set = {};
    if (selectedAnswer !== undefined) {
      if (selectedAnswer !== null && !(Number.isInteger(selectedAnswer) && selectedAnswer >= 0 && selectedAnswer <= 3)) {
        throw new AppError(400, 'selectedAnswer must be 0-3 or null');
      }
      set[`${path}.selectedAnswer`] = selectedAnswer;
    }
    if (markedForReview !== undefined) set[`${path}.markedForReview`] = !!markedForReview;
    if (visited !== undefined) set[`${path}.visited`] = !!visited;
    if (!Object.keys(set).length) throw new AppError(400, 'Nothing to save');

    const r = await Attempt.updateOne(
      { _id: attempt._id, status: 'IN_PROGRESS', [`${path}.questionId`]: new mongoose.Types.ObjectId(String(questionId)) },
      { $set: set }
    );
    if (r.matchedCount === 0) {
      throw new AppError(409, 'Answer could not be saved because the test is already submitted', { code: 'ATTEMPT_SUBMITTED' });
    }
    res.json({ success: true, savedAt: new Date() });
  })
);

/** Final submit — idempotent, score calculated on the server only */
router.post(
  '/:id/submit',
  asyncHandler(async (req, res) => {
    const attempt = await loadAttempt(req, { ownerOnly: true });
    if (attempt.status === 'SUBMITTED') {
      return res.json({ success: true, alreadySubmitted: true, attemptId: attempt._id });
    }
    const clientAnswers = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, 1000) : undefined;
    const done = await finalizeAttempt(attempt._id, { clientAnswers });
    res.json({ success: true, alreadySubmitted: false, attemptId: done._id, autoSubmitted: done.autoSubmitted });
  })
);

/** Review with correct answers + explanations (only after submission) */
router.get(
  '/:id/review',
  asyncHandler(async (req, res) => {
    let attempt = await loadAttempt(req);
    attempt = await ensureFresh(attempt);
    if (attempt.status !== 'SUBMITTED') throw new AppError(400, 'Review is available after the test is submitted');

    const [test, qs] = await Promise.all([
      Test.findById(attempt.testId).select('title language subject exam duration').lean(),
      Question.find({ _id: { $in: attempt.questionIds } }).lean(),
    ]);
    const byId = new Map(qs.map((q) => [String(q._id), q]));
    const ansMap = new Map(attempt.answers.map((a) => [String(a.questionId), a]));

    const questions = attempt.questionIds
      .map((qid, i) => {
        const q = byId.get(String(qid));
        if (!q) return null;
        const a = ansMap.get(String(qid));
        const sel = Number.isInteger(a?.selectedAnswer) ? a.selectedAnswer : null;
        let status = 'UNATTEMPTED';
        if (sel !== null) {
          const correct = a?.isCorrect ?? sel === q.correctAnswer; // stored grading wins over later edits
          status = correct ? 'CORRECT' : 'WRONG';
        }
        return {
          id: q._id,
          number: i + 1,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          selectedAnswer: sel,
          markedForReview: !!a?.markedForReview,
          status,
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      test: { id: attempt.testId, title: test?.title || 'Deleted test', language: test?.language || 'BILINGUAL' },
      attempt: attemptSummary(attempt),
      questions,
    });
  })
);

export default router;
