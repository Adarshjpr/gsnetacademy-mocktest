import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/AppError.js';

export const COOKIE_NAME = 'token';

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  // COOKIE_SECURE=true once the site runs on HTTPS; plain-HTTP deployments need false
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  path: '/',
});

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

export const authenticate = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.[COOKIE_NAME];
  const header = req.headers.authorization;
  if (!token && header?.startsWith('Bearer ')) token = header.slice(7);
  if (!token) throw new AppError(401, 'Please log in to continue');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'Your session has expired. Please log in again');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError(401, 'Account not found. Please log in again');
  if (user.status === 'BLOCKED') throw new AppError(403, 'Your account has been blocked. Contact the admin');

  req.user = user;

  // Track "last active" without writing on every request
  const last = user.lastActiveAt ? user.lastActiveAt.getTime() : 0;
  if (Date.now() - last > 5 * 60 * 1000) {
    User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } }).catch(() => {});
  }
  next();
});

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') return next(new AppError(403, 'Admin access required'));
  next();
}
