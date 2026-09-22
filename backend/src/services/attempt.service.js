import mongoose from 'mongoose';
import Attempt from '../models/Attempt.js';
import Question from '../models/Question.js';

/** Small grace period for network latency before an attempt is treated as expired. */
export const EXPIRY_GRACE_MS = 5000;

const round2 = (n) => Math.round(n * 100) / 100;

export const isExpired = (attempt, now = Date.now()) =>
  now > new Date(attempt.expiresAt).getTime() + EXPIRY_GRACE_MS;

/**
 * Pure scoring function. correctMap: Map<questionId string, correct option index>.
 * Questions deleted after the attempt started are counted as unattempted.
 */
export function computeResult({ questionIds, answers, marksPerQuestion, negativeMarking }, correctMap) {
  const ansMap = new Map((answers || []).map((a) => [String(a.questionId), a]));
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;

  const graded = questionIds.map((qid) => {
    const a = ansMap.get(String(qid)) || {};
    const sel = Number.isInteger(a.selectedAnswer) ? a.selectedAnswer : null;
    const right = correctMap.get(String(qid));
    let isCorrect = null;
    if (sel === null || right === undefined) unattempted++;
    else if (sel === right) {
      correct++;
      isCorrect = true;
    } else {
      wrong++;
      isCorrect = false;
    }
    return {
      questionId: qid,
      selectedAnswer: sel,
      markedForReview: !!a.markedForReview,
      visited: !!a.visited,
      isCorrect,
    };
  });

  const totalMarks = round2(questionIds.length * marksPerQuestion);
  const score = round2(correct * marksPerQuestion - wrong * negativeMarking);
  const attempted = correct + wrong;
  return {
    answers: graded,
    correctCount: correct,
    wrongCount: wrong,
    unattemptedCount: unattempted,
    score,
    totalMarks,
    percentage: totalMarks > 0 ? round2((score / totalMarks) * 100) : 0,
    accuracy: attempted > 0 ? round2((correct / attempted) * 100) : 0,
  };
}

/** Merge answers sent with the final submit (safety net for any failed autosaves). */
export function mergeClientAnswers(serverAnswers, clientAnswers, questionIds) {
  const valid = new Set(questionIds.map(String));
  const map = new Map(serverAnswers.map((a) => [String(a.questionId), { ...a }]));
  for (const c of clientAnswers || []) {
    if (!c || !valid.has(String(c.questionId))) continue;
    const cur = map.get(String(c.questionId)) || { questionId: c.questionId, visited: true };
    if (c.selectedAnswer === null || (Number.isInteger(c.selectedAnswer) && c.selectedAnswer >= 0 && c.selectedAnswer <= 3)) {
      cur.selectedAnswer = c.selectedAnswer;
    }
    if (typeof c.markedForReview === 'boolean') cur.markedForReview = c.markedForReview;
    map.set(String(c.questionId), cur);
  }
  return [...map.values()];
}

/**
 * Scores and closes an attempt. Safe to call many times / concurrently:
 * only the first call flips IN_PROGRESS -> SUBMITTED, later calls return the saved result.
 */
export async function finalizeAttempt(attemptId, { auto = false, clientAnswers } = {}) {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) return null;
  if (attempt.status === 'SUBMITTED') return attempt;

  const now = Date.now();
  const expired = isExpired(attempt, now);
  let answers = attempt.answers.map((a) => a.toObject());
  // Answers arriving after time is over are ignored
  if (clientAnswers && !expired) answers = mergeClientAnswers(answers, clientAnswers, attempt.questionIds);

  const questions = await Question.find({ _id: { $in: attempt.questionIds } }).select('correctAnswer').lean();
  const correctMap = new Map(questions.map((q) => [String(q._id), q.correctAnswer]));
  const result = computeResult(
    {
      questionIds: attempt.questionIds,
      answers,
      marksPerQuestion: attempt.marksPerQuestion,
      negativeMarking: attempt.negativeMarking,
    },
    correctMap
  );

  const endAt = new Date(Math.min(now, attempt.expiresAt.getTime()));
  const timeTaken = Math.max(0, Math.round((endAt.getTime() - attempt.startedAt.getTime()) / 1000));

  const updated = await Attempt.findOneAndUpdate(
    { _id: attempt._id, status: 'IN_PROGRESS' },
    {
      $set: {
        ...result,
        status: 'SUBMITTED',
        submittedAt: endAt,
        timeTaken,
        autoSubmitted: auto || expired,
      },
    },
    { new: true }
  );
  return updated || Attempt.findById(attempt._id);
}

/** If an in-progress attempt is past its expiry, submit it now. */
export async function ensureFresh(attempt) {
  if (attempt && attempt.status === 'IN_PROGRESS' && isExpired(attempt)) {
    return finalizeAttempt(attempt._id, { auto: true });
  }
  return attempt;
}

/** Finalizes expired attempts for users who closed the browser and never came back. */
export function startExpirySweeper(intervalMs = 30000) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const stale = await Attempt.find({
        status: 'IN_PROGRESS',
        expiresAt: { $lt: new Date(Date.now() - EXPIRY_GRACE_MS) },
      })
        .select('_id')
        .limit(200)
        .lean();
      for (const s of stale) {
        await finalizeAttempt(s._id, { auto: true }).catch((e) => console.error('Auto-submit failed', s._id, e));
      }
      if (stale.length) console.log(`Auto-submitted ${stale.length} expired attempt(s)`);
    } catch (e) {
      console.error('Expiry sweeper error', e);
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref?.();
  return timer;
}

/**
 * Per-test leaderboard: each user's best attempt.
 * Order: higher score, then lower time taken, then earlier submission.
 */
export async function getLeaderboard(testId) {
  const rows = await Attempt.aggregate([
    { $match: { testId: new mongoose.Types.ObjectId(String(testId)), status: 'SUBMITTED' } },
    { $sort: { score: -1, timeTaken: 1, submittedAt: 1 } },
    {
      $group: {
        _id: '$userId',
        attemptId: { $first: '$_id' },
        score: { $first: '$score' },
        totalMarks: { $first: '$totalMarks' },
        percentage: { $first: '$percentage' },
        timeTaken: { $first: '$timeTaken' },
        submittedAt: { $first: '$submittedAt' },
        attempts: { $sum: 1 },
      },
    },
    { $sort: { score: -1, timeTaken: 1, submittedAt: 1 } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        username: '$user.username',
        attemptId: 1,
        score: 1,
        totalMarks: 1,
        percentage: 1,
        timeTaken: 1,
        submittedAt: 1,
        attempts: 1,
      },
    },
  ]);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Rank of a specific attempt against every other user's best attempt. */
export function rankForAttempt(attempt, board) {
  const uid = String(attempt.userId?._id ?? attempt.userId);
  const sub = new Date(attempt.submittedAt).getTime();
  let better = 0;
  for (const e of board) {
    if (String(e.userId) === uid) continue;
    const es = new Date(e.submittedAt).getTime();
    if (
      e.score > attempt.score ||
      (e.score === attempt.score &&
        (e.timeTaken < attempt.timeTaken || (e.timeTaken === attempt.timeTaken && es < sub)))
    ) {
      better++;
    }
  }
  return better + 1;
}
