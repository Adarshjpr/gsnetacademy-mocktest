import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../../api.js';
import { Badge, ErrorBox, Loader, Pager } from '../../components/UI.jsx';
import { fmtDate, fmtDuration, fmtNum } from '../../utils/format.js';

export default function AdminAttempts() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => setPage(1), [status]);
  useEffect(() => {
    setError('');
    api(`/admin/attempts${qs({ status, page })}`).then(setData).catch((e) => setError(e.message));
  }, [status, page]);

  return (
    <div className="stack-lg">
      <div className="section-head">
        <h1>Attempts</h1>
        {data && <span className="muted">{data.total} total</span>}
      </div>
      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="IN_PROGRESS">In progress</option>
        </select>
      </div>
      <ErrorBox message={error} />
      {!data ? <Loader /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student</th><th>Test</th><th>Started</th><th className="num">Score</th><th className="num">Time</th><th /></tr></thead>
            <tbody>
              {data.attempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.user.id ? <Link to={`/admin/users/${a.user.id}`}>{a.user.username}</Link> : a.user.username}</td>
                  <td>{a.test.title}</td>
                  <td>{fmtDate(a.startedAt)}</td>
                  {a.status === 'SUBMITTED' ? (
                    <>
                      <td className="num">{fmtNum(a.score)} / {fmtNum(a.totalMarks)} <span className="muted small">({fmtNum(a.percentage)}%)</span></td>
                      <td className="num">{fmtDuration(a.timeTaken)}{a.autoSubmitted && <span className="muted small"> (auto)</span>}</td>
                      <td className="row-actions"><Link to={`/result/${a.id}`}>Result</Link><Link to={`/review/${a.id}`}>Review</Link></td>
                    </>
                  ) : (
                    <td colSpan={3}><Badge tone="warn">In progress</Badge></td>
                  )}
                </tr>
              ))}
              {data.attempts.length === 0 && <tr><td colSpan={6} className="muted">No attempts.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
    </div>
  );
}
