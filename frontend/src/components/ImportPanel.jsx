import { useState } from 'react';
import { api } from '../api.js';
import { LABELS } from '../utils/format.js';

const SAMPLE = {
  questions: [
    {
      question: { en: 'What is 2 + 2?', hi: '2 + 2 कितना होता है?' },
      options: { en: ['2', '3', '4', '5'], hi: ['2', '3', '4', '5'] },
      correctAnswer: 2,
      explanation: {
        en: { correct: '2 + 2 equals 4.', options: { 0: '2 is too small.', 1: '3 is off by one.', 2: '4 is correct.', 3: '5 is too large.' } },
        hi: { correct: '2 + 2 बराबर 4 होता है।', options: { 0: '2 बहुत छोटा है।', 1: '3 एक कम है।', 2: '4 सही है।', 3: '5 बहुत बड़ा है।' } },
      },
    },
  ],
};

/** Paste/upload JSON → validate on server (dry run) → preview → import. All-or-nothing. */
export default function ImportPanel({ testId, onImported, onCancel }) {
  const [text, setText] = useState('');
  const [step, setStep] = useState('input'); // input | preview
  const [problems, setProblems] = useState([]);
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);

  const parse = () => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setProblems([`The text is not valid JSON: ${e.message}`]);
      return null;
    }
    const list = Array.isArray(parsed) ? parsed : parsed?.questions;
    if (!Array.isArray(list)) {
      setProblems(['JSON must be an array of questions or an object with a "questions" array.']);
      return null;
    }
    return list;
  };

  const validate = async () => {
    setProblems([]);
    const list = parse();
    if (!list) return;
    setBusy(true);
    try {
      const d = await api('/questions/import', { method: 'POST', body: { testId, questions: list, dryRun: true } });
      setPreview(d.preview);
      setStep('preview');
    } catch (e) {
      setProblems(e.data?.messages || [e.message]);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    const list = parse();
    if (!list) return;
    setBusy(true);
    try {
      const d = await api('/questions/import', { method: 'POST', body: { testId, questions: list } });
      onImported(d.imported);
    } catch (e) {
      setProblems(e.data?.messages || [e.message]);
      setStep('input');
      setBusy(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setText(String(r.result || ''));
    r.readAsText(f, 'utf-8');
  };

  if (step === 'preview') {
    return (
      <div className="stack">
        <div className="alert alert-success">All {preview.length} question(s) are valid. Check the preview, then import.</div>
        <ol className="import-preview">
          {preview.map((q, i) => (
            <li key={i}>
              <p>{q.question.en}</p>
              <p lang="hi" className="muted">{q.question.hi}</p>
              <p className="small">Correct: <b>{LABELS[q.correctAnswer]}. {q.options.en[q.correctAnswer]}</b> / <span lang="hi">{q.options.hi[q.correctAnswer]}</span></p>
            </li>
          ))}
        </ol>
        <div className="modal-actions">
          <button className="btn" onClick={() => setStep('input')} disabled={busy}>Back to edit</button>
          <button className="btn btn-primary" onClick={doImport} disabled={busy}>{busy ? 'Importing…' : `Import ${preview.length} question(s)`}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <p className="muted small">
        Paste JSON or upload a .json file. Each question needs Hindi and English text, exactly 4 options in both languages,
        <code> correctAnswer</code> as 0-3 (or A-D) and an explanation in both languages. Nothing is saved if any question has a problem.
      </p>
      <div className="button-row">
        <label className="btn btn-small file-btn">
          Upload .json
          <input type="file" accept=".json,application/json" onChange={onFile} hidden />
        </label>
        <button className="btn btn-small btn-ghost" onClick={() => setText(JSON.stringify(SAMPLE, null, 2))}>Insert example format</button>
      </div>
      <textarea className="code-area" rows={16} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} placeholder='{ "questions": [ ... ] }' aria-label="Questions JSON" />
      {problems.length > 0 && (
        <div className="alert alert-error" role="alert">
          <strong>Fix these and validate again:</strong>
          <ul className="problem-list">{problems.slice(0, 100).map((m, i) => <li key={i}>{m}</li>)}</ul>
          {problems.length > 100 && <p>…and {problems.length - 100} more.</p>}
        </div>
      )}
      <div className="modal-actions">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={validate} disabled={busy || !text.trim()}>{busy ? 'Checking…' : 'Validate & preview'}</button>
      </div>
    </div>
  );
}
