import { AppError } from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors).map((e) => e.message);
    message = details[0] || 'Validation failed';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0];
    const friendly = {
      username: 'This username is already taken',
      email: 'An account with this email already exists',
      mobile: 'An account with this mobile number already exists',
    };
    message = friendly[field] || `Duplicate value for ${field || 'a unique field'}`;
  }

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }

  const body = { success: false, message };
  if (details) body.details = details;
  if (typeof err.code === 'string') body.code = err.code;
  res.status(status).json(body);
}
