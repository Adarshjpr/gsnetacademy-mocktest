import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { EMAIL_RE, isNonEmptyString, normalizeMobile, validateRegister } from '../utils/validators.js';
import { authenticate, clearAuthCookie, setAuthCookie, signToken } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const errors = validateRegister(req.body);
    if (errors.length) throw new AppError(400, errors[0], { details: errors });

    const username = req.body.username.trim().toLowerCase();
    const email = req.body.email.trim().toLowerCase();
    const mobile = normalizeMobile(req.body.mobile);

    const taken = await User.findOne({ $or: [{ username }, { email }, { mobile }] }).select('username email mobile').lean();
    if (taken) {
      const details = [];
      if (taken.username === username) details.push('This username is already taken');
      if (taken.email === email) details.push('An account with this email already exists');
      if (taken.mobile === mobile) details.push('An account with this mobile number already exists');
      throw new AppError(409, details[0], { details });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const now = new Date();
    const user = await User.create({
      username,
      passwordHash,
      name: req.body.name.trim().replace(/\s+/g, ' '),
      email,
      mobile,
      language: req.body.language === 'en' ? 'en' : 'hi',
      lastLoginAt: now,
      lastActiveAt: now,
    });

    setAuthCookie(res, signToken(user));
    res.status(201).json({ success: true, user: user.toSafeJSON() });
  })
);

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    // "identifier" can be a username, an email or a mobile number
    const { password } = req.body || {};
    const identifier = req.body?.identifier ?? req.body?.username;
    if (!isNonEmptyString(identifier) || typeof password !== 'string' || !password) {
      throw new AppError(400, 'Username / email / mobile and password are required');
    }
    const id = identifier.trim().toLowerCase();
    let query = { username: id };
    if (EMAIL_RE.test(id)) query = { email: id };
    else if (normalizeMobile(id)) query = { mobile: normalizeMobile(id) };
    const user = await User.findOne(query).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, 'Invalid login details or password');
    }
    if (user.status === 'BLOCKED') throw new AppError(403, 'Your account has been blocked. Contact the admin');

    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    await user.save();

    setAuthCookie(res, signToken(user));
    res.json({ success: true, user: user.toSafeJSON() });
  })
);

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});

/** Saves the candidate's preferred language (हिन्दी / English) */
router.patch(
  '/me/language',
  authenticate,
  asyncHandler(async (req, res) => {
    const { language } = req.body || {};
    if (!['en', 'hi'].includes(language)) throw new AppError(400, 'Language must be en or hi');
    await User.updateOne({ _id: req.user._id }, { $set: { language } });
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: user.toSafeJSON() });
  })
);

export default router;
