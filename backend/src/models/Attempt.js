import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedAnswer: { type: Number, min: 0, max: 3, default: null },
    markedForReview: { type: Boolean, default: false },
    visited: { type: Boolean, default: false },
    isCorrect: { type: Boolean, default: null },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    status: { type: String, enum: ['IN_PROGRESS', 'SUBMITTED'], default: 'IN_PROGRESS', index: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    submittedAt: Date,
    timeTaken: { type: Number, default: 0 }, // seconds
    autoSubmitted: { type: Boolean, default: false },

    // Snapshot taken at start so later edits to the test do not change a running exam
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    marksPerQuestion: { type: Number, required: true },
    negativeMarking: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },

    answers: [answerSchema],

    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Only one running attempt per user per test (protects against double "Start" clicks)
attemptSchema.index(
  { userId: 1, testId: 1 },
  { unique: true, partialFilterExpression: { status: 'IN_PROGRESS' }, name: 'one_active_attempt_per_test' }
);
attemptSchema.index({ testId: 1, status: 1, score: -1, timeTaken: 1, submittedAt: 1 });

export default mongoose.model('Attempt', attemptSchema);
