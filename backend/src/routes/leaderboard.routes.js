import { Router } from 'express';
import Test from '../models/Test.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { authenticate } from '../middleware/auth.js';
import { assertObjectId } from '../utils/validators.js';
import { getLeaderboard } from '../services/attempt.service.js';

const router = Router();

router.get(
  '/test/:testId',
  authenticate,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.testId, 'test id');
    const test = await Test.findById(req.params.testId).select('title subject exam status questionIds marksPerQuestion').lean();
    if (!test || (test.status === 'DRAFT' && req.user.role !== 'ADMIN')) throw new AppError(404, 'Test not found');

    const board = await getLeaderboard(test._id);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const me = board.find((e) => String(e.userId) === String(req.user._id)) || null;

    res.json({
      success: true,
      test: {
        id: test._id,
        title: test.title,
        subject: test.subject,
        exam: test.exam,
        totalMarks: Math.round(test.questionIds.length * test.marksPerQuestion * 100) / 100,
      },
      totalParticipants: board.length,
      entries: board.slice(0, limit),
      me,
    });
  })
);

export default router;
