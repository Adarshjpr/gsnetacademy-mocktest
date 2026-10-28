/**
 * Compact builder for bilingual MCQs.
 * mcq({ answer: 'B', topic, en: { q, o: [4], exp, why: [4], cue }, hi: { ...same } })
 * `why[i]` explains a wrong option; for the correct option the main explanation is used.
 */
const L = ['A', 'B', 'C', 'D'];

function side(s, ans, lang) {
  const cueLabel = lang === 'hi' ? 'याद रखें' : 'Memory cue';
  const correct = s.cue ? `${s.exp} ${cueLabel}: ${s.cue}` : s.exp;
  const options = s.o.map((_, i) => (i === ans ? s.exp : s.why[i]));
  return { correct, options };
}

export function mcq({ answer, topic = '', en, hi }) {
  const ans = L.indexOf(answer);
  if (ans < 0) throw new Error(`Bad answer ${answer}`);
  return {
    question: { en: en.q, hi: hi.q },
    options: { en: en.o, hi: hi.o },
    correctAnswer: ans,
    explanation: { en: side(en, ans, 'en'), hi: side(hi, ans, 'hi') },
    topic,
  };
}
