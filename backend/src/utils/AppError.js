export class AppError extends Error {
  constructor(status, message, { details, code } = {}) {
    super(message);
    this.status = status;
    if (details) this.details = details;
    if (code) this.code = code;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
