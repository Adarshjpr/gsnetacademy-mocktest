import { Router } from 'express';
import mongoose from 'mongoose';
import Question from '../models/Question.js';
import Test, { toTestSummary } from '../models/Test.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { assertObjectId, normalizeQuestion, validateQuestion } from '../utils/validators.js';

const router = Router();
router.use(authenticate, requireAdmin); // full question data (with answers) is admin-only

const MAX_IMPORT = 500;

function checkQuestion(body) {
  const q = normalizeQuestion(body);
  const errors = validateQuestion(q);
  if (errors.length) throw new AppError(400, errors[0], { details: errors });
  return q;
}

/** All questions of a test in exam order */
router.get(
  '/test/:testId',
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.testId, 'test id');
    const test = await Test.findById(req.params.testId).lean();
    if (!test) throw new AppError(404, 'Test not found');
    const qs = await Question.find({ testId: test._id }).lean();
    const byId = new Map(qs.map((q) => [String(q._id), q]));
    const ordered = test.questionIds.map((id) => byId.get(String(id))).filter(Boolean);
    res.json({ success: true, test: toTestSummary(test), questions: ordered });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { testId } = req.body || {};
    assertObjectId(testId, 'test id');
    const test = await Test.findById(testId);
    if (!test) throw new AppError(404, 'Test not found');
    const q = checkQuestion(req.body);
    const created = await Question.create({ ...q, testId: test._id });
    await Test.updateOne({ _id: test._id }, { $push: { questionIds: created._id } });
    res.status(201).json({ success: true, question: created });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'question id');
    const q = checkQuestion(req.body);
    const updated = await Question.findByIdAndUpdate(req.params.id, { $set: q }, { new: true, runValidators: true });
    if (!updated) throw new AppError(404, 'Question not found');
    res.json({ success: true, question: updated });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'question id');
    const q = await Question.findByIdAndDelete(req.params.id);
    if (!q) throw new AppError(404, 'Question not found');
    await Test.updateOne({ _id: q.testId }, { $pull: { questionIds: q._id } });
    res.json({ success: true });
  })
);

/**
 * JSON import. Body: { testId, questions: [...], dryRun?: boolean }
 * All-or-nothing: if any question is invalid, nothing is saved.
 */
router.post(
  '/import',
  asyncHandler(async (req, res) => {
    const { testId, dryRun } = req.body || {};
    const list = req.body?.questions;
    assertObjectId(testId, 'test id');
    if (!Array.isArray(list)) throw new AppError(400, '"questions" must be an array');
    if (list.length === 0) throw new AppError(400, 'No questions found in the JSON');
    if (list.length > MAX_IMPORT) throw new AppError(400, `You can import at most ${MAX_IMPORT} questions at a time`);

    const test = await Test.findById(testId);
    if (!test) throw new AppError(404, 'Test not found');

    const normalized = list.map(normalizeQuestion);
    const errors = [];
    normalized.forEach((q, i) => {
      const errs = validateQuestion(q);
      if (errs.length) errors.push({ index: i, questionNumber: i + 1, errors: errs });
    });
    if (errors.length) {
      return res.status(422).json({
        success: false,
        message: `${errors.length} question(s) have problems. Nothing was imported.`,
        errors,
        messages: errors.flatMap((e) => e.errors.map((m) => `Question ${e.questionNumber}: ${m}.`)),
      });
    }

    if (dryRun) return res.json({ success: true, dryRun: true, count: normalized.length, preview: normalized });

    // Pre-assign ids so a failure midway can be rolled back (works without replica-set transactions)
    const docs = normalized.map((q) => ({ ...q, _id: new mongoose.Types.ObjectId(), testId: test._id }));
    const ids = docs.map((d) => d._id);
    try {
      await Question.insertMany(docs, { ordered: true });
      await Test.updateOne({ _id: test._id }, { $push: { questionIds: { $each: ids } } });
    } catch (err) {
      await Question.deleteMany({ _id: { $in: ids } }).catch(() => {});
      await Test.updateOne({ _id: test._id }, { $pull: { questionIds: { $in: ids } } }).catch(() => {});
      throw err;
    }
    res.status(201).json({ success: true, imported: docs.length });
  })
);

export default router;
