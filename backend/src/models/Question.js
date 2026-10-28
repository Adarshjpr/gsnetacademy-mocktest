import mongoose from 'mongoose';

const fourStrings = {
  validator: (arr) => Array.isArray(arr) && arr.length === 4,
  message: 'Exactly 4 options are required',
};

const explanationLang = new mongoose.Schema(
  {
    correct: { type: String, default: '' },
    options: { type: [String], default: ['', '', '', ''] }, // why each option is right/wrong
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    question: {
      en: { type: String, required: true },
      hi: { type: String, required: true },
    },
    options: {
      en: { type: [String], validate: fourStrings },
      hi: { type: [String], validate: fourStrings },
    },
    correctAnswer: { type: Number, required: true, min: 0, max: 3 }, // never sent during an exam
    explanation: {
      en: { type: explanationLang, default: () => ({}) },
      hi: { type: explanationLang, default: () => ({}) },
    },
    topic: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Question', questionSchema);
