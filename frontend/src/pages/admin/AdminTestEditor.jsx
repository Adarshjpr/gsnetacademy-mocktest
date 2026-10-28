import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { Badge, ErrorBox, Loader, Modal } from '../../components/UI.jsx';
import LanguageSwitch from '../../components/LanguageSwitch.jsx';
import QuestionForm from '../../components/QuestionForm.jsx';
import ImportPanel from '../../components/ImportPanel.jsx';
import { LABELS, fmtNum } from '../../utils/format.js';

const DEFAULTS = {
  title: '', description: '', exam: '', subject: '', category: 'MOCK', difficulty: 'MEDIUM', language: 'BILINGUAL',
  duration: 60, marksPerQuestion: 2, negativeMarking: 0.5, instructions: { en: '', hi: '' },
};

export default function AdminTestEditor() {
  const { testId } = useParams();
  const isNew = !testId;
  const navigate = useNavigate();

  const [form, setForm] = useState(DEFAULTS);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | question
  const [importing, setImporting] = useState(false);
  const [previewLang, setPreviewLang] = useState('en');

  const load = async () => {
    if (isNew) return;
    setError('');
    try {
      const d = await api(`/questions/test/${testId}`);
      setTest(d.test);
      setQuestions(d.questions);
      const t = d.test;
      setForm({
        title: t.title, description: t.description || '', exam: t.exam || '', subject: t.subject || '', category: t.category,
        difficulty: t.difficulty, language: t.language, duration: t.duration, marksPerQuestion: t.marksPerQuestion,
        negativeMarking: t.negativeMarking, instructions: { en: t.instructions?.en || '', hi: t.instructions?.hi || '' },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [testId]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(''), 3000); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const saveMeta = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = { ...form, duration: Number(form.duration), marksPerQuestion: Number(form.marksPerQuestion), negativeMarking: Number(form.negativeMarking) };
    try {
      if (isNew) {
        const d = await api('/tests', { method: 'POST', body });
        navigate(`/admin/tests/${d.test.id}`, { replace: true });
      } else {
        const d = await api(`/tests/${testId}`, { method: 'PUT', body });
        setTest((t) => ({ ...t, ...d.test }));
        flash('Test details saved');
      }
    } catch (err) {
      setError(err.data?.details?.join('. ') || err.message);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status) => {
    setError('');
    try {
      const d = await api(`/tests/${testId}/status`, { method: 'POST', body: { status } });
      setTest(d.test);
      flash(status === 'PUBLISHED' ? 'Published — students can see this test now' : `Status changed to ${status.toLowerCase()}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const saveQuestion = async (payload) => {
    if (editing === 'new') await api('/questions', { method: 'POST', body: { ...payload, testId } });
    else await api(`/questions/${editing._id}`, { method: 'PUT', body: payload });
    setEditing(null);
    flash('Question saved');
    load();
  };

  const deleteQuestion = async (q, i) => {
    if (!window.confirm(`Delete question ${i + 1}?`)) return;
    try {
      await api(`/questions/${q._id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const move = async (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[i], next[j]] = [next[j], next[i]];
    setQuestions(next);
    try {
      await api(`/tests/${testId}/reorder`, { method: 'PUT', body: { questionIds: next.map((q) => q._id) } });
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="stack-lg">
      <Link to="/admin/tests" className="back-link">← All tests</Link>
      <div className="section-head">
        <h1>{isNew ? 'New test' : form.title || 'Edit test'}</h1>
        {test && (
          <div className="button-row">
            <Badge tone={test.status === 'PUBLISHED' ? 'success' : test.status === 'DRAFT' ? 'warn' : 'neutral'}>{test.status.toLowerCase()}</Badge>
            {test.status !== 'PUBLISHED' && <button className="btn btn-primary btn-small" onClick={() => setStatus('PUBLISHED')}>Publish</button>}
            {test.status === 'PUBLISHED' && <button className="btn btn-small" onClick={() => setStatus('DRAFT')}>Unpublish</button>}
            {test.status !== 'ARCHIVED' && <button className="btn btn-small btn-ghost" onClick={() => setStatus('ARCHIVED')}>Archive</button>}
          </div>
        )}
      </div>

      <ErrorBox message={error} />
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <form className="panel test-form" onSubmit={saveMeta}>
        <h2>Test details</h2>
        <label className="field"><span>Title</span><input value={form.title} onChange={set('title')} required maxLength={200} /></label>
        <label className="field"><span>Description</span><textarea rows={2} value={form.description} onChange={set('description')} /></label>
        <div className="grid-3">
          <label className="field"><span>Exam</span><input value={form.exam} onChange={set('exam')} placeholder="SSC, NEET, JEE…" /></label>
          <label className="field"><span>Subject</span><input value={form.subject} onChange={set('subject')} placeholder="Mathematics" /></label>
          <label className="field"><span>Type</span>
            <select value={form.category} onChange={set('category')}>
              <option value="MOCK">Mock test</option><option value="PYQ">Previous year</option><option value="PRACTICE">Practice</option>
            </select>
          </label>
          <label className="field"><span>Difficulty</span>
            <select value={form.difficulty} onChange={set('difficulty')}>
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </label>
          <label className="field"><span>Language</span>
            <select value={form.language} onChange={set('language')}>
              <option value="BILINGUAL">Hindi + English</option><option value="EN">English only</option><option value="HI">Hindi only</option>
            </select>
          </label>
          <label className="field"><span>Duration (minutes)</span><input type="number" min={1} max={600} value={form.duration} onChange={set('duration')} required /></label>
          <label className="field"><span>Marks per correct answer</span><input type="number" min={0} step="0.25" value={form.marksPerQuestion} onChange={set('marksPerQuestion')} /></label>
          <label className="field"><span>Negative marks per wrong answer</span><input type="number" min={0} step="0.25" value={form.negativeMarking} onChange={set('negativeMarking')} /></label>
        </div>
        <details>
          <summary>Extra instructions for this test (optional)</summary>
          <div className="bi-row">
            <label className="field"><span>English</span><textarea rows={3} value={form.instructions.en} onChange={(e) => setForm({ ...form, instructions: { ...form.instructions, en: e.target.value } })} /></label>
            <label className="field"><span lang="hi">हिन्दी</span><textarea rows={3} lang="hi" value={form.instructions.hi} onChange={(e) => setForm({ ...form, instructions: { ...form.instructions, hi: e.target.value } })} /></label>
          </div>
        </details>
        <div className="button-row">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create test and add questions' : 'Save details'}</button>
          {test && <span className="muted small">{test.totalQuestions} questions · {fmtNum(test.totalMarks)} marks</span>}
        </div>
      </form>

      {!isNew && (
        <section className="stack">
          <div className="section-head">
            <h2>Questions ({questions.length})</h2>
            <div className="button-row">
              <LanguageSwitch value={previewLang} onChange={setPreviewLang} compact />
              <button className="btn" onClick={() => setImporting(true)}>Import JSON</button>
              <button className="btn btn-primary" onClick={() => setEditing('new')}>Add question</button>
            </div>
          </div>
          {questions.length === 0 ? (
            <div className="empty"><strong>No questions yet</strong><div>Add them one by one or import a JSON file.</div></div>
          ) : (
            <ol className="q-list">
              {questions.map((q, i) => (
                <li key={q._id} className="q-item">
                  <span className="q-no">{i + 1}</span>
                  <div className="q-body" lang={previewLang}>
                    <p>{q.question[previewLang]}</p>
                    <ul className="q-opts">
                      {q.options[previewLang].map((o, k) => (
                        <li key={k} className={k === q.correctAnswer ? 'is-correct' : ''}><b>{LABELS[k]}.</b> {o}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="q-actions">
                    <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === questions.length - 1} aria-label="Move down">↓</button>
                    <button className="btn-link" onClick={() => setEditing(q)}>Edit</button>
                    <button className="btn-link txt-danger" onClick={() => deleteQuestion(q, i)}>Delete</button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add question' : 'Edit question'} onClose={() => setEditing(null)} wide>
          <QuestionForm initial={editing === 'new' ? null : editing} onSave={saveQuestion} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {importing && (
        <Modal title="Import questions from JSON" onClose={() => setImporting(false)} wide>
          <ImportPanel
            testId={testId}
            onCancel={() => setImporting(false)}
            onImported={(n) => { setImporting(false); flash(`${n} question(s) imported`); load(); }}
          />
        </Modal>
      )}
    </div>
  );
}
