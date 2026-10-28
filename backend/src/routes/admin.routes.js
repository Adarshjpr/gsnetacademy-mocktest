import { Router } from 'express';
import User from '../models/User.js';
import Test, { toTestSummary } from '../models/Test.js';
import Attempt from '../models/Attempt.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { assertObjectId, pageParams, searchRegex } from '../utils/validators.js';

const router = Router();
router.use(authenticate, requireAdmin);

const TZ = () => process.env.APP_TIMEZONE || 'Asia/Kolkata';
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ() }).format(d); // YYYY-MM-DD
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

/** Start of "today" in APP_TIMEZONE, as a UTC Date */
function startOfToday() {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ(), hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const secondsIntoDay = (Number(parts.hour) % 24) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  return new Date(now.getTime() - secondsIntoDay * 1000 - now.getMilliseconds());
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const today = startOfToday();
    const weekAgo = new Date(today.getTime() - 6 * 24 * 3600 * 1000);

    const [totalUsers, totalTests, published, drafts, archived, totalAttempts, todaysAttempts, inProgress, recent, daily, topTests] =
      await Promise.all([
        User.countDocuments({ role: 'USER' }),
        Test.countDocuments(),
        Test.countDocuments({ status: 'PUBLISHED' }),
        Test.countDocuments({ status: 'DRAFT' }),
        Test.countDocuments({ status: 'ARCHIVED' }),
        Attempt.countDocuments({ status: 'SUBMITTED' }),
        Attempt.countDocuments({ createdAt: { $gte: today } }),
        Attempt.countDocuments({ status: 'IN_PROGRESS' }),
        Attempt.find({ status: 'SUBMITTED' })
          .sort({ submittedAt: -1 })
          .limit(10)
          .populate('userId', 'username')
          .populate('testId', 'title')
          .lean(),
        Attempt.aggregate([
          { $match: { createdAt: { $gte: weekAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ() } }, count: { $sum: 1 } } },
        ]),
        Attempt.aggregate([
          { $match: { status: 'SUBMITTED' } },
          { $group: { _id: '$testId', attempts: { $sum: 1 }, avg: { $avg: '$percentage' } } },
          { $sort: { attempts: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'tests', localField: '_id', foreignField: '_id', as: 't' } },
          { $unwind: '$t' },
          { $project: { _id: 0, testId: '$_id', title: '$t.title', attempts: 1, avg: 1 } },
        ]),
      ]);

    const counts = new Map(daily.map((d) => [d._id, d.count]));
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * 24 * 3600 * 1000));
      last7Days.push({ date: key, count: counts.get(key) || 0 });
    }

    res.json({
      success: true,
      stats: { totalUsers, totalTests, published, drafts, archived, totalAttempts, todaysAttempts, inProgress },
      last7Days,
      topTests: topTests.map((t) => ({ ...t, avg: round1(t.avg) })),
      recentAttempts: recent.map((a) => ({
        id: a._id,
        username: a.userId?.username || 'deleted user',
        userId: a.userId?._id,
        testTitle: a.testId?.title || 'Deleted test',
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: a.percentage,
        submittedAt: a.submittedAt,
      })),
    });
  })
);

/** User "activity list": everyone with their test stats */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageParams(req.query, 20);
    const filter = {};
    const rx = searchRegex(req.query.q);
    if (rx) filter.$or = [{ username: rx }, { name: rx }, { email: rx }, { mobile: rx }];
    if (['USER', 'ADMIN'].includes(req.query.role)) filter.role = req.query.role;
    if (['ACTIVE', 'BLOCKED'].includes(req.query.status)) filter.status = req.query.status;

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ lastActiveAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const stats = await Attempt.aggregate([
      { $match: { userId: { $in: users.map((u) => u._id) }, status: 'SUBMITTED' } },
      {
        $group: {
          _id: '$userId',
          attempts: { $sum: 1 },
          tests: { $addToSet: '$testId' },
          avg: { $avg: '$percentage' },
          best: { $max: '$percentage' },
          lastAttemptAt: { $max: '$submittedAt' },
        },
      },
    ]);
    const byUser = new Map(stats.map((s) => [String(s._id), s]));

    res.json({
      success: true,
      page,
      limit,
      total,
      users: users.map((u) => {
        const s = byUser.get(String(u._id));
        return {
          id: u._id,
          username: u.username,
          name: u.name || '',
          email: u.email || '',
          mobile: u.mobile || '',
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          lastActiveAt: u.lastActiveAt || u.lastLoginAt,
          totalAttempts: s?.attempts || 0,
          testsAttempted: s?.tests.length || 0,
          averagePercentage: round1(s?.avg),
          highestPercentage: round1(s?.best),
          lastAttemptAt: s?.lastAttemptAt || null,
        };
      }),
    });
  })
);

router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'user id');
    const user = await User.findById(req.params.id).lean();
    if (!user) throw new AppError(404, 'User not found');

    const attempts = await Attempt.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('testId', 'title subject exam')
      .lean();
    const submitted = attempts.filter((a) => a.status === 'SUBMITTED');

    const subjects = new Map();
    for (const a of submitted) {
      const key = a.testId?.subject || 'General';
      const s = subjects.get(key) || { subject: key, attempts: 0, sum: 0, best: -Infinity };
      s.attempts += 1;
      s.sum += a.percentage;
      s.best = Math.max(s.best, a.percentage);
      subjects.set(key, s);
    }
    const best = submitted.reduce((m, a) => (!m || a.percentage > m.percentage ? a : m), null);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        lastActiveAt: user.lastActiveAt || user.lastLoginAt,
      },
      stats: {
        totalAttempts: submitted.length,
        inProgress: attempts.length - submitted.length,
        testsAttempted: new Set(submitted.map((a) => String(a.testId?._id || a.testId))).size,
        averagePercentage: submitted.length ? round1(submitted.reduce((s, a) => s + a.percentage, 0) / submitted.length) : null,
        highestPercentage: best ? round1(best.percentage) : null,
        highestScore: best ? { score: best.score, totalMarks: best.totalMarks, testTitle: best.testId?.title } : null,
      },
      subjectWise: [...subjects.values()]
        .map((s) => ({ subject: s.subject, attempts: s.attempts, average: round1(s.sum / s.attempts), best: round1(s.best) }))
        .sort((a, b) => b.attempts - a.attempts),
      attempts: attempts.map((a) => ({
        id: a._id,
        status: a.status,
        test: { id: a.testId?._id || a.testId, title: a.testId?.title || 'Deleted test', subject: a.testId?.subject || '' },
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: a.percentage,
        timeTaken: a.timeTaken,
        autoSubmitted: a.autoSubmitted,
      })),
    });
  })
);

router.patch(
  '/users/:id/status',
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'user id');
    const { status } = req.body || {};
    if (!['ACTIVE', 'BLOCKED'].includes(status)) throw new AppError(400, 'status must be ACTIVE or BLOCKED');
    if (String(req.params.id) === String(req.user._id)) throw new AppError(400, 'You cannot change your own status');
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!user) throw new AppError(404, 'User not found');
    res.json({ success: true, user: user.toSafeJSON() });
  })
);

router.get(
  '/attempts',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageParams(req.query, 25);
    const filter = {};
    if (['IN_PROGRESS', 'SUBMITTED'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.testId) {
      assertObjectId(req.query.testId, 'test id');
      filter.testId = req.query.testId;
    }
    if (req.query.userId) {
      assertObjectId(req.query.userId, 'user id');
      filter.userId = req.query.userId;
    }
    const [total, attempts] = await Promise.all([
      Attempt.countDocuments(filter),
      Attempt.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username')
        .populate('testId', 'title')
        .lean(),
    ]);
    res.json({
      success: true,
      page,
      limit,
      total,
      attempts: attempts.map((a) => ({
        id: a._id,
        status: a.status,
        user: { id: a.userId?._id, username: a.userId?.username || 'deleted user' },
        test: { id: a.testId?._id, title: a.testId?.title || 'Deleted test' },
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: a.percentage,
        timeTaken: a.timeTaken,
        autoSubmitted: a.autoSubmitted,
      })),
    });
  })
);

/** Every test (all statuses) with attempt counts */
router.get(
  '/tests',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(req.query.status)) filter.status = req.query.status;
    const rx = searchRegex(req.query.q);
    if (rx) filter.$or = [{ title: rx }, { subject: rx }, { exam: rx }];
    const tests = await Test.find(filter).sort({ updatedAt: -1 }).lean();
    const counts = await Attempt.aggregate([
      { $match: { testId: { $in: tests.map((t) => t._id) }, status: 'SUBMITTED' } },
      { $group: { _id: '$testId', attempts: { $sum: 1 }, users: { $addToSet: '$userId' } } },
    ]);
    const byTest = new Map(counts.map((c) => [String(c._id), c]));
    res.json({
      success: true,
      tests: tests.map((t) => {
        const c = byTest.get(String(t._id));
        return { ...toTestSummary(t), attempts: c?.attempts || 0, participants: c?.users.length || 0 };
      }),
    });
  })
);

export default router;
