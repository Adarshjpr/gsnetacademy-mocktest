import { Router } from 'express';
import Test, { toTestSummary } from '../models/Test.js';
import Question from '../models/Question.js';
import Attempt from '../models/Attempt.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { assertObjectId, sanitizeTestPayload, searchRegex, TEST_STATUSES } from '../utils/validators.js';
import { ensureFresh } from '../services/attempt.service.js';

const router = Router();
router.use(authenticate);

const qStr = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Values for the dashboard filter dropdowns */
router.get(
  '/filters',
  asyncHandler(async (req, res) => {
    const [subjects, exams] = await Promise.all([
      Test.distinct('subject', { status: 'PUBLISHED', subject: { $ne: '' } }),
      Test.distinct('exam', { status: 'PUBLISHED', exam: { $ne: '' } }),
    ]);
    res.json({ success: true, subjects: subjects.sort(), exams: exams.sort() });
  })
);

/** Published tests with search + filters */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { status: 'PUBLISHED' };
    const { subject, exam, category, difficulty, language } = req.query;
    if (qStr(subject)) filter.subject = qStr(subject);
    if (qStr(exam)) filter.exam = qStr(exam);
    if (qStr(category)) filter.category = qStr(category);
    if (qStr(difficulty)) filter.difficulty = qStr(difficulty);
    if (qStr(language)) {
      filter.language = language === 'BILINGUAL' ? 'BILINGUAL' : { $in: [String(language), 'BILINGUAL'] };
    }
    const rx = searchRegex(req.query.q);
    if (rx) filter.$or = [{ title: rx }, { subject: rx }, { exam: rx }, { category: rx }, { description: rx }];

    const tests = await Test.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, tests: tests.map(toTestSummary) });
  })
);

/** Test details + the user's running attempt (for "Resume") */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'test id');
    const test = await Test.findById(req.params.id).lean();
    if (!test || (test.status !== 'PUBLISHED' && req.user.role !== 'ADMIN')) throw new AppError(404, 'Test not found');

    let running = await Attempt.findOne({ userId: req.user._id, testId: test._id, status: 'IN_PROGRESS' });
    running = await ensureFresh(running);
    const submittedAttempts = await Attempt.countDocuments({ userId: req.user._id, testId: test._id, status: 'SUBMITTED' });

    res.json({
      success: true,
      test: toTestSummary(test),
      inProgressAttemptId: running && running.status === 'IN_PROGRESS' ? running._id : null,
      submittedAttempts,
    });
  })
);

/* ------------------------- Admin ------------------------- */

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { data, errors } = sanitizeTestPayload(req.body);
    if (errors.length) throw new AppError(400, errors[0], { details: errors });
    const test = await Test.create({ ...data, status: 'DRAFT', createdBy: req.user._id });
    res.status(201).json({ success: true, test: toTestSummary(test) });
  })
);

router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'test id');
    const { data, errors } = sanitizeTestPayload(req.body, { partial: true });
    if (errors.length) throw new AppError(400, errors[0], { details: errors });
    const test = await Test.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!test) throw new AppError(404, 'Test not found');
    res.json({ success: true, test: toTestSummary(test) });
  })
);

router.post(
  '/:id/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'test id');
    const { status } = req.body || {};
    if (!TEST_STATUSES.includes(status)) throw new AppError(400, `status must be one of: ${TEST_STATUSES.join(', ')}`);
    const test = await Test.findById(req.params.id);
    if (!test) throw new AppError(404, 'Test not found');
    if (status === 'PUBLISHED' && test.questionIds.length === 0) {
      throw new AppError(400, 'Add at least one question before publishing');
    }
    test.status = status;
    await test.save();
    res.json({ success: true, test: toTestSummary(test) });
  })
);

router.put(
  '/:id/reorder',
  requireAdmin,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'test id');
    const ids = req.body?.questionIds;
    const test = await Test.findById(req.params.id);
    if (!test) throw new AppError(404, 'Test not found');
    const current = test.questionIds.map(String);
    if (
      !Array.isArray(ids) ||
      ids.length !== current.length ||
      new Set(ids.map(String)).size !== ids.length ||
      !ids.every((id) => current.includes(String(id)))
    ) {
      throw new AppError(400, 'questionIds must contain exactly the questions of this test');
    }
    test.questionIds = ids;
    await test.save();
    res.json({ success: true, questionIds: test.questionIds });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'test id');
    const test = await Test.findById(req.params.id);
    if (!test) throw new AppError(404, 'Test not found');
    if (await Attempt.exists({ testId: test._id })) {
      throw new AppError(409, 'Students have attempted this test. Archive it instead of deleting.');
    }
    await Question.deleteMany({ testId: test._id });
    await test.deleteOne();
    res.json({ success: true });
  })
);

export default router;
