import * as nationalMovement from './national-movement.js';
import * as indianCulture from './indian-culture.js';
import * as teaching1 from './teaching-aptitude-1.js';
import * as teaching2 from './teaching-aptitude-2.js';

/**
 * UGC NET pattern: 150 questions in 180 minutes → 1.2 minutes per question,
 * 2 marks per question, no negative marking.
 */
export const NET_MINUTES_PER_QUESTION = 1.2;
export const NET_MARKS = 2;
export const NET_NEGATIVE = 0;

export const NET_INSTRUCTIONS = {
  en: 'This test follows the UGC NET/JRF pattern: every question carries 2 marks and there is NO negative marking. Time is given at the NET rate of 1.2 minutes per question (150 questions in 3 hours). Attempt every question.',
  hi: 'यह टेस्ट UGC NET/JRF पैटर्न पर है: हर प्रश्न 2 अंक का है और कोई नकारात्मक अंकन (माइनस मार्किंग) नहीं है। समय NET की दर से दिया गया है — प्रति प्रश्न 1.2 मिनट (3 घंटे में 150 प्रश्न)। हर प्रश्न का उत्तर दें।',
};

export const SEED_TESTS = [nationalMovement, indianCulture, teaching1, teaching2];
