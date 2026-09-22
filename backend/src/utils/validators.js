import mongoose from 'mongoose';
import { AppError } from './AppError.js';

export const OPTION_LABELS = ['A', 'B', 'C', 'D'];
export const CATEGORIES = ['MOCK', 'PYQ', 'PRACTICE'];
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
export const TEST_LANGUAGES = ['BILINGUAL', 'EN', 'HI'];
export const TEST_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

export function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchRegex(q) {
  if (typeof q !== 'string' || !q.trim()) return null;
  return new RegExp(escapeRegex(q.trim().slice(0, 100)), 'i');
}

export function assertObjectId(id, name = 'id') {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, `Invalid ${name}`);
}

export function pageParams(query, defLimit = 20, maxLimit = 100) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

/* ---------------- Auth ---------------- */

/** Normalises an Indian mobile number to 10 digits ("+91 98765-43210" -> "9876543210"). Returns '' if invalid. */
export function normalizeMobile(value) {
  if (value === undefined || value === null) return '';
  let d = String(value).replace(/[\s\-()]/g, '');
  if (d.startsWith('+91')) d = d.slice(3);
  else if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : '';
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** All six fields are required: name, email, mobile, username, password, confirmPassword */
export function validateRegister(body = {}) {
  const errors = [];
  const { username, password, confirmPassword, name, email, mobile } = body;

  if (!isNonEmptyString(name)) errors.push('Full name is required');
  else if (name.trim().length < 2) errors.push('Full name must be at least 2 characters');
  else if (name.trim().length > 80) errors.push('Full name is too long (max 80 characters)');
  else if (!/^[\p{L}\p{M} .'-]+$/u.test(name.trim())) errors.push('Full name can contain only letters, spaces, . \' and -');

  if (!isNonEmptyString(email)) errors.push('Email is required');
  else if (email.trim().length > 120 || !EMAIL_RE.test(email.trim())) errors.push('Enter a valid email address');

  if (!isNonEmptyString(mobile)) errors.push('Mobile number is required');
  else if (!normalizeMobile(mobile)) errors.push('Enter a valid 10-digit mobile number (starting with 6, 7, 8 or 9)');

  if (!isNonEmptyString(username)) errors.push('Username is required');
  else if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username.trim()))
    errors.push('Username must be 3-30 characters and use only letters, numbers, _ or .');

  if (typeof password !== 'string' || password.length < 6) errors.push('Password must be at least 6 characters');
  else if (password.length > 100) errors.push('Password is too long');
  if (password !== confirmPassword) errors.push('Passwords do not match');
  return errors;
}

/* ---------------- Test ---------------- */

export function sanitizeTestPayload(body = {}, { partial = false } = {}) {
  const data = {};
  const errors = [];

  const str = (key, max, required = false) => {
    if (body[key] === undefined) {
      if (required && !partial) errors.push(`${key} is required`);
      return;
    }
    if (typeof body[key] !== 'string') return errors.push(`${key} must be text`);
    const v = body[key].trim();
    if (required && !v) return errors.push(`${key} is required`);
    if (v.length > max) return errors.push(`${key} is too long (max ${max} characters)`);
    data[key] = v;
  };
  const oneOf = (key, list) => {
    if (body[key] === undefined) return;
    if (!list.includes(body[key])) errors.push(`${key} must be one of: ${list.join(', ')}`);
    else data[key] = body[key];
  };
  const num = (key, min, max, required = false) => {
    if (body[key] === undefined || body[key] === '') {
      if (required && !partial) errors.push(`${key} is required`);
      return;
    }
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n < min || n > max) errors.push(`${key} must be a number between ${min} and ${max}`);
    else data[key] = n;
  };

  str('title', 200, true);
  str('description', 3000);
  str('exam', 100);
  str('subject', 100);
  oneOf('category', CATEGORIES);
  oneOf('difficulty', DIFFICULTIES);
  oneOf('language', TEST_LANGUAGES);
  num('duration', 1, 600, true);
  num('marksPerQuestion', 0, 100);
  num('negativeMarking', 0, 100);
  if (body.instructions !== undefined) {
    const ins = body.instructions || {};
    data.instructions = {
      en: String(ins.en || '').slice(0, 5000),
      hi: String(ins.hi || '').slice(0, 5000),
    };
  }
  return { data, errors };
}

/* ---------------- Question ---------------- */

const trimStr = (v) => (typeof v === 'string' ? v.trim() : v);

function normalizeExplanationLang(v) {
  if (typeof v === 'string') return { correct: v.trim(), options: ['', '', '', ''] };
  if (!v || typeof v !== 'object') return { correct: '', options: ['', '', '', ''] };
  const opts = v.options;
  let arr = ['', '', '', ''];
  if (Array.isArray(opts)) {
    arr = [0, 1, 2, 3].map((i) => (typeof opts[i] === 'string' ? opts[i].trim() : ''));
  } else if (opts && typeof opts === 'object') {
    arr = [0, 1, 2, 3].map((i) => {
      const x = opts[i] ?? opts[String(i)] ?? opts[OPTION_LABELS[i]] ?? opts[OPTION_LABELS[i].toLowerCase()];
      return typeof x === 'string' ? x.trim() : '';
    });
  }
  return { correct: typeof v.correct === 'string' ? v.correct.trim() : '', options: arr };
}

/** Accepts admin form / JSON import input and returns the stored shape. */
export function normalizeQuestion(raw) {
  const q = raw && typeof raw === 'object' ? raw : {};
  const opts = q.options || {};
  let ca = q.correctAnswer;
  if (typeof ca === 'string') {
    const s = ca.trim();
    if (/^[A-Da-d]$/.test(s)) ca = OPTION_LABELS.indexOf(s.toUpperCase());
    else if (s !== '') ca = Number(s);
  }
  return {
    question: { en: trimStr(q.question?.en), hi: trimStr(q.question?.hi) },
    options: {
      en: Array.isArray(opts.en) ? opts.en.map(trimStr) : opts.en,
      hi: Array.isArray(opts.hi) ? opts.hi.map(trimStr) : opts.hi,
    },
    correctAnswer: ca,
    explanation: {
      en: normalizeExplanationLang(q.explanation?.en),
      hi: normalizeExplanationLang(q.explanation?.hi),
    },
    topic: typeof q.topic === 'string' ? q.topic.trim().slice(0, 100) : '',
  };
}

/** Returns human readable errors, e.g. "Hindi option B is missing". */
export function validateQuestion(q) {
  const errors = [];
  if (!isNonEmptyString(q.question.en)) errors.push('English question text is missing');
  if (!isNonEmptyString(q.question.hi)) errors.push('Hindi question text is missing');
  for (const [lang, name] of [['en', 'English'], ['hi', 'Hindi']]) {
    const arr = q.options[lang];
    if (!Array.isArray(arr)) {
      errors.push(`${name} options are missing`);
      continue;
    }
    if (arr.length !== 4) errors.push(`${name} options must be exactly 4 (found ${arr.length})`);
    for (let i = 0; i < 4; i++) {
      if (!isNonEmptyString(arr[i])) errors.push(`${name} option ${OPTION_LABELS[i]} is missing`);
    }
  }
  if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3)
    errors.push('correctAnswer must be between 0 and 3');
  if (!isNonEmptyString(q.explanation.en.correct)) errors.push('English explanation is missing');
  if (!isNonEmptyString(q.explanation.hi.correct)) errors.push('Hindi explanation is missing');
  const tooLong = [q.question.en, q.question.hi].some((t) => typeof t === 'string' && t.length > 5000);
  if (tooLong) errors.push('Question text is too long (max 5000 characters)');
  return errors;
}
