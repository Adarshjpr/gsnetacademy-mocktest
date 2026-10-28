import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { ErrorBox, Loader } from '../../components/UI.jsx';
import { fmtDate, fmtNum } from '../../utils/format.js';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = () => {
    setError('');
    api('/admin/dashboard').then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loader />;
  const { stats, last7Days, topTests, recentAttempts } = data;
  const max = Math.max(1, ...last7Days.map((d) => d.count));

  return (
    <div className="stack-lg">
      <h1>Overview</h1>
      <dl className="stat-strip">
        <div><dt>Students</dt><dd>{stats.totalUsers}</dd></div>
        <div><dt>Tests</dt><dd>{stats.totalTests}</dd><small>{stats.published} published · {stats.drafts} draft</small></div>
        <div><dt>Submitted attempts</dt><dd>{stats.totalAttempts}</dd></div>
        <div><dt>Attempts today</dt><dd>{stats.todaysAttempts}</dd></div>
        <div><dt>Running now</dt><dd>{stats.inProgress}</dd></div>
      </dl>

      <div className="two-col">
        <section className="panel">
          <h2>Attempts in the last 7 days</h2>
          <div className="bars" role="img" aria-label="Attempts per day">
            {last7Days.map((d) => (
              <div key={d.date} className="bar-col">
                <span className="bar-val">{d.count}</span>
                <span className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
                <span className="bar-label">{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Most attempted tests</h2>
          {topTests.length === 0 ? <p className="muted">No attempts yet.</p> : (
            <ol className="rank-list">
              {topTests.map((t) => (
                <li key={t.testId}>
                  <Link to={`/leaderboard/${t.testId}`}>{t.title}</Link>
                  <span className="muted small">{t.attempts} attempts · avg {fmtNum(t.avg)}%</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="stack">
        <div className="section-head">
          <h2>Latest submissions</h2>
          <Link to="/admin/attempts">All attempts</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student</th><th>Test</th><th className="num">Score</th><th>Submitted</th><th /></tr></thead>
            <tbody>
              {recentAttempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.userId ? <Link to={`/admin/users/${a.userId}`}>{a.username}</Link> : a.username}</td>
                  <td>{a.testTitle}</td>
                  <td className="num">{fmtNum(a.score)} / {fmtNum(a.totalMarks)}</td>
                  <td>{fmtDate(a.submittedAt)}</td>
                  <td className="row-actions"><Link to={`/result/${a.id}`}>Result</Link></td>
                </tr>
              ))}
              {recentAttempts.length === 0 && <tr><td colSpan={5} className="muted">No submissions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
