import { useState } from 'react';
import { LABELS } from '../utils/format.js';

export const emptyQuestion = () => ({
  question: { en: '', hi: '' },
  options: { en: ['', '', '', ''], hi: ['', '', '', ''] },
  correctAnswer: 0,
  explanation: { en: { correct: '', options: ['', '', '', ''] }, hi: { correct: '', options: ['', '', '', ''] } },
  topic: '',
});

function fromServer(q) {
  const base = emptyQuestion();
  if (!q) return base;
  const four = (arr) => [0, 1, 2, 3].map((i) => arr?.[i] || '');
  return {
    question: { en: q.question?.en || '', hi: q.question?.hi || '' },
    options: { en: four(q.options?.en), hi: four(q.options?.hi) },
    correctAnswer: q.correctAnswer ?? 0,
    explanation: {
      en: { correct: q.explanation?.en?.correct || '', options: four(q.explanation?.en?.options) },
      hi: { correct: q.explanation?.hi?.correct || '', options: four(q.explanation?.hi?.options) },
    },
    topic: q.topic || '',
  };
}

/** Bilingual question editor. onSave(payload) should throw on server error. */
export default function QuestionForm({ initial, onSave, onCancel }) {
  const [q, setQ] = useState(() => fromServer(initial));
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const edit = (fn) => setQ((prev) => { const next = structuredClone(prev); fn(next); return next; });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await onSave(q);
    } catch (err) {
      setErrors(err.data?.details || [err.message]);
      setBusy(false);
    }
  };

  return (
    <form className="qform" onSubmit={submit}>
      {errors.length > 0 && (
        <div className="alert alert-error" role="alert"><ul>{errors.map((m) => <li key={m}>{m}</li>)}</ul></div>
      )}

      <fieldset>
        <legend>Question</legend>
        <div className="bi-row">
          <label className="field"><span>English</span>
            <textarea rows={3} value={q.question.en} onChange={(e) => edit((d) => { d.question.en = e.target.value; })} required />
          </label>
          <label className="field"><span lang="hi">हिन्दी</span>
            <textarea rows={3} lang="hi" value={q.question.hi} onChange={(e) => edit((d) => { d.question.hi = e.target.value; })} required />
          </label>
        </div>
        <label className="field field-narrow"><span>Topic (optional)</span>
          <input value={q.topic} onChange={(e) => edit((d) => { d.topic = e.target.value; })} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Options — select the correct one</legend>
        {LABELS.map((L, i) => (
          <div key={L} className={`opt-block ${q.correctAnswer === i ? 'is-correct' : ''}`}>
            <label className="opt-correct">
              <input type="radio" name="correct" checked={q.correctAnswer === i} onChange={() => edit((d) => { d.correctAnswer = i; })} />
              <span className="option-key">{L}</span>
              <span className="small">{q.correctAnswer === i ? 'Correct answer' : 'Mark correct'}</span>
            </label>
            <div className="bi-row">
              <label className="field"><span>Option {L} — English</span>
                <input value={q.options.en[i]} onChange={(e) => edit((d) => { d.options.en[i] = e.target.value; })} required />
              </label>
              <label className="field"><span>Option {L} — हिन्दी</span>
                <input lang="hi" value={q.options.hi[i]} onChange={(e) => edit((d) => { d.options.hi[i] = e.target.value; })} required />
              </label>
            </div>
            <div className="bi-row">
              <label className="field"><span>Why {L} is {q.correctAnswer === i ? 'right' : 'wrong'} — English</span>
                <input value={q.explanation.en.options[i]} onChange={(e) => edit((d) => { d.explanation.en.options[i] = e.target.value; })} />
              </label>
              <label className="field"><span>Why {L} is {q.correctAnswer === i ? 'right' : 'wrong'} — हिन्दी</span>
                <input lang="hi" value={q.explanation.hi.options[i]} onChange={(e) => edit((d) => { d.explanation.hi.options[i] = e.target.value; })} />
              </label>
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>Main explanation (shown with the correct answer)</legend>
        <div className="bi-row">
          <label className="field"><span>English</span>
            <textarea rows={3} value={q.explanation.en.correct} onChange={(e) => edit((d) => { d.explanation.en.correct = e.target.value; })} required />
          </label>
          <label className="field"><span lang="hi">हिन्दी</span>
            <textarea rows={3} lang="hi" value={q.explanation.hi.correct} onChange={(e) => edit((d) => { d.explanation.hi.correct = e.target.value; })} required />
          </label>
        </div>
      </fieldset>

      <div className="modal-actions sticky-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save question'}</button>
      </div>
    </form>
  );
}
