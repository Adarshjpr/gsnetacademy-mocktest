import mongoose from 'mongoose';
import { CATEGORIES, DIFFICULTIES, TEST_LANGUAGES, TEST_STATUSES } from '../utils/validators.js';

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 3000 },
    exam: { type: String, default: '', trim: true },
    subject: { type: String, default: '', trim: true },
    category: { type: String, enum: CATEGORIES, default: 'MOCK' },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'MEDIUM' },
    language: { type: String, enum: TEST_LANGUAGES, default: 'BILINGUAL' },
    duration: { type: Number, required: true, min: 1, max: 600 }, // minutes
    marksPerQuestion: { type: Number, default: 2, min: 0 },
    negativeMarking: { type: Number, default: 0.5, min: 0 }, // marks deducted per wrong answer
    instructions: { en: { type: String, default: '' }, hi: { type: String, default: '' } },
    status: { type: String, enum: TEST_STATUSES, default: 'DRAFT', index: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }], // order = exam order
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export function toTestSummary(t) {
  const totalQuestions = (t.questionIds || []).length;
  return {
    id: t._id,
    title: t.title,
    description: t.description,
    exam: t.exam,
    subject: t.subject,
    category: t.category,
    difficulty: t.difficulty,
    language: t.language,
    duration: t.duration,
    marksPerQuestion: t.marksPerQuestion,
    negativeMarking: t.negativeMarking,
    totalQuestions,
    totalMarks: Math.round(totalQuestions * t.marksPerQuestion * 100) / 100,
    instructions: t.instructions || { en: '', hi: '' },
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export default mongoose.model('Test', testSchema);
