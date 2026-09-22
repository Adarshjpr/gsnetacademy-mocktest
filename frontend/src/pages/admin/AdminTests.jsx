import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../../api.js';
import { Badge, Empty, ErrorBox, Loader, useDebounced } from '../../components/UI.jsx';
import { CATEGORY_LABEL, fmtDate, fmtNum } from '../../utils/format.js';

const TONE = { PUBLISHED: 'success', DRAFT: 'warn', ARCHIVED: 'neutral' };

export default function AdminTests() {
  const [tests, setTests] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const dq = useDebounced(q);

  const load = () => {
    setError('');
    api(`/admin/tests${qs({ q: dq, status })}`).then((d) => setTests(d.tests)).catch((e) => setError(e.message));
  };
  useEffect(load, [dq, status]);

  const setTestStatus = async (t, next) => {
    try {
      await api(`/tests/${t.id}/status`, { method: 'POST', body: { status: next } });
      load();
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.title}" and all its questions? This cannot be undone.`)) return;
    try {
      await api(`/tests/${t.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="stack-lg">
      <div className="section-head">
        <h1>Tests & questions</h1>
        <Link className="btn btn-primary" to="/admin/tests/new">New test</Link>
      </div>
      <div className="filters">
        <input type="search" placeholder="Search tests" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tests" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      <ErrorBox message={error} />
      {!tests ? <Loader /> : tests.length === 0 ? (
        <Empty title="No tests yet"><Link className="btn btn-primary" to="/admin/tests/new">Create the first test</Link></Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Test</th><th>Status</th><th className="num">Questions</th><th className="num">Marks</th><th className="num">Attempts</th><th>Updated</th><th /></tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link className="cell-title" to={`/admin/tests/${t.id}`}>{t.title}</Link>
                    <div className="muted small">{[CATEGORY_LABEL[t.category], t.exam, t.subject, `${t.duration} min`].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td><Badge tone={TONE[t.status]}>{t.status.toLowerCase()}</Badge></td>
                  <td className="num">{t.totalQuestions}</td>
                  <td className="num">{fmtNum(t.totalMarks)}</td>
                  <td className="num">{t.attempts} <span className="muted small">({t.participants} users)</span></td>
                  <td>{fmtDate(t.updatedAt, false)}</td>
                  <td className="row-actions">
                    <Link to={`/admin/tests/${t.id}`}>Edit</Link>
                    {t.status !== 'PUBLISHED' && <button className="btn-link" onClick={() => setTestStatus(t, 'PUBLISHED')}>Publish</button>}
                    {t.status === 'PUBLISHED' && <button className="btn-link" onClick={() => setTestStatus(t, 'DRAFT')}>Unpublish</button>}
                    {t.status !== 'ARCHIVED' && <button className="btn-link" onClick={() => setTestStatus(t, 'ARCHIVED')}>Archive</button>}
                    {t.attempts === 0 && <button className="btn-link txt-danger" onClick={() => remove(t)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
