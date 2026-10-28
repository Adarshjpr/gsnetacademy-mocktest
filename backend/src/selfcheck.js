// Offline sanity checks for scoring, ranking and question validation (no database needed).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { computeResult, mergeClientAnswers, rankForAttempt } from './services/attempt.service.js';
import { normalizeMobile, normalizeQuestion, validateQuestion, validateRegister } from './utils/validators.js';
import User from './models/User.js';
import './app.js'; // makes sure every route module loads

const id = () => new mongoose.Types.ObjectId();
const [q1, q2, q3, q4] = [id(), id(), id(), id()];
const correctMap = new Map([[String(q1), 0], [String(q2), 1], [String(q3), 2], [String(q4), 3]]);

const r = computeResult(
  {
    questionIds: [q1, q2, q3, q4],
    answers: [
      { questionId: q1, selectedAnswer: 0 },
      { questionId: q2, selectedAnswer: 3 },
      { questionId: q3, selectedAnswer: null },
      { questionId: q4, selectedAnswer: 3 },
    ],
    marksPerQuestion: 2,
    negativeMarking: 0.5,
  },
  correctMap
);
assert.equal(r.correctCount, 2);
assert.equal(r.wrongCount, 1);
assert.equal(r.unattemptedCount, 1);
assert.equal(r.score, 3.5); // 2*2 - 1*0.5
assert.equal(r.totalMarks, 8);
assert.equal(r.percentage, 43.75);
assert.equal(r.accuracy, 66.67);

const merged = mergeClientAnswers([{ questionId: q1, selectedAnswer: null }], [{ questionId: q1, selectedAnswer: 2 }, { questionId: id(), selectedAnswer: 1 }], [q1]);
assert.equal(merged.length, 1);
assert.equal(merged[0].selectedAnswer, 2);

const t = (m) => new Date(Date.UTC(2026, 0, 1, 0, m));
const board = [
  { userId: 'a', score: 10, timeTaken: 100, submittedAt: t(1) },
  { userId: 'b', score: 10, timeTaken: 90, submittedAt: t(5) },
  { userId: 'c', score: 8, timeTaken: 50, submittedAt: t(0) },
];
assert.equal(rankForAttempt({ userId: 'b', score: 10, timeTaken: 90, submittedAt: t(5) }, board), 1);
assert.equal(rankForAttempt({ userId: 'a', score: 10, timeTaken: 100, submittedAt: t(1) }, board), 2);
assert.equal(rankForAttempt({ userId: 'd', score: 10, timeTaken: 100, submittedAt: t(2) }, board), 3); // later than "a"

const sample = JSON.parse(readFileSync(new URL('../sample-questions.json', import.meta.url)));
for (const raw of sample.questions) assert.deepEqual(validateQuestion(normalizeQuestion(raw)), []);
assert.equal(normalizeQuestion(sample.questions[1]).correctAnswer, 2); // "C" -> 2

const bad = normalizeQuestion({ question: { en: 'x' }, options: { en: ['a', 'b', 'c', 'd'], hi: ['a', '', 'c', 'd'] }, correctAnswer: 7, explanation: { en: 'e' } });
const errs = validateQuestion(bad);
assert.ok(errs.includes('Hindi question text is missing'));
assert.ok(errs.includes('Hindi option B is missing'));
assert.ok(errs.includes('correctAnswer must be between 0 and 3'));
assert.ok(errs.includes('Hindi explanation is missing'));

// Registration: name, email and mobile are mandatory
const good = { name: 'Ravi Kumar', email: 'ravi@example.com', mobile: '+91 98765-43210', username: 'ravi_k', password: 'secret1', confirmPassword: 'secret1' };
assert.deepEqual(validateRegister(good), []);
const missing = validateRegister({ ...good, name: '', email: '', mobile: '' });
assert.ok(missing.includes('Full name is required'));
assert.ok(missing.includes('Email is required'));
assert.ok(missing.includes('Mobile number is required'));
assert.ok(validateRegister({ ...good, email: 'ravi@' }).includes('Enter a valid email address'));
assert.ok(validateRegister({ ...good, mobile: '12345' })[0].startsWith('Enter a valid 10-digit'));
assert.equal(normalizeMobile('+91 98765-43210'), '9876543210');
assert.equal(normalizeMobile('09876543210'), '9876543210');
assert.equal(normalizeMobile('919876543210'), '9876543210');
assert.equal(normalizeMobile('5876543210'), '');
// Schema: students need all three fields, the bootstrap admin does not
const noContact = new User({ username: 'x', passwordHash: 'h' }).validateSync();
assert.ok(noContact.errors.name && noContact.errors.email && noContact.errors.mobile);
assert.equal(new User({ username: 'admin', passwordHash: 'h', role: 'ADMIN' }).validateSync(), undefined);

// Bundled UGC NET tests: every question valid, NET timing and marking
const { prepareSeedTests } = await import('./services/seedTests.js');
const seeds = prepareSeedTests();
assert.equal(seeds.length, 4);
assert.deepEqual(seeds.map((s) => s.questions.length), [20, 20, 25, 25]);
assert.deepEqual(seeds.map((s) => s.test.duration), [24, 24, 30, 30]);
for (const s of seeds) {
  assert.equal(s.test.negativeMarking, 0);
  assert.equal(s.test.marksPerQuestion, 2);
  for (const q of s.questions) {
    assert.equal(q.explanation.en.options.length, 4);
    q.explanation.en.options.forEach((t, i) => assert.ok(t, `${s.test.title}: empty EN option explanation ${i}`));
    q.explanation.hi.options.forEach((t, i) => assert.ok(t, `${s.test.title}: empty HI option explanation ${i}`));
    assert.equal(new Set(q.options.en).size, 4, `${s.test.title}: duplicate EN options in "${q.question.en}"`);
  }
}

console.log('All self-checks passed ✔');
process.exit(0);
