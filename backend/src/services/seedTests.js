import Test from '../models/Test.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { normalizeQuestion, validateQuestion } from '../utils/validators.js';
import { NET_INSTRUCTIONS, NET_MARKS, NET_MINUTES_PER_QUESTION, NET_NEGATIVE, SEED_TESTS } from '../data/index.js';

/** Checks every bundled question; throws with readable messages if any is invalid. */
export function prepareSeedTests() {
  return SEED_TESTS.map(({ test, questions }) => {
    const normalized = questions.map(normalizeQuestion);
    const problems = normalized.flatMap((q, i) => validateQuestion(q).map((m) => `${test.title} — Q${i + 1}: ${m}`));
    if (problems.length) throw new Error(problems.join('\n'));
    return {
      test: {
        title: test.title,
        description: test.description,
        exam: test.exam,
        subject: test.subject,
        category: test.category,
        difficulty: test.difficulty,
        language: 'BILINGUAL',
        duration: Math.round(questions.length * NET_MINUTES_PER_QUESTION),
        marksPerQuestion: NET_MARKS,
        negativeMarking: NET_NEGATIVE,
        instructions: NET_INSTRUCTIONS,
      },
      questions: normalized,
    };
  });
}

/**
 * Creates the bundled UGC NET tests once. Safe to run on every start:
 * a test whose title already exists is left untouched (admin edits are kept).
 */
export async function ensureSeedTests({ log = console.log } = {}) {
  const admin = await User.findOne({ role: 'ADMIN' }).select('_id').lean();
  let created = 0;
  for (const { test, questions } of prepareSeedTests()) {
    if (await Test.exists({ title: test.title })) continue;
    const doc = await Test.create({ ...test, status: 'DRAFT', createdBy: admin?._id });
    try {
      const qs = await Question.insertMany(questions.map((q) => ({ ...q, testId: doc._id })));
      doc.questionIds = qs.map((q) => q._id);
      doc.status = 'PUBLISHED';
      await doc.save();
      created += 1;
      log(`Seeded "${test.title}" (${qs.length} questions, ${test.duration} min)`);
    } catch (e) {
      await Question.deleteMany({ testId: doc._id });
      await Test.deleteOne({ _id: doc._id });
      throw e;
    }
  }
  if (!created) log('Bundled tests already present — nothing to seed.');
  return created;
}
