import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge, ErrorBox, Loader } from '../../components/UI.jsx';
import { fmtDate, fmtDuration, fmtNum, timeAgo } from '../../utils/format.js';

export default function AdminUserDetails() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError('');
    api(`/admin/users/${userId}`).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [userId]);

  const toggleStatus = async () => {
    const next = data.user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    if (next === 'BLOCKED' && !window.confirm(`Block ${data.user.username}? They will not be able to log in.`)) return;
    setBusy(true);
    try {
      await api(`/admin/users/${userId}/status`, { method: 'PATCH', body: { status: next } });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loader />;
  const { user: u, stats, subjectWise, attempts } = data;

  return (
    <div className="stack-lg">
      <Link to="/admin/users" className="back-link">← Users</Link>
      <section className="profile-head">
        <span className="avatar avatar-xl">{u.username[0].toUpperCase()}</span>
        <div className="profile-main">
          <h1>{u.name || u.username} {u.role === 'ADMIN' && <Badge tone="info">Admin</Badge>} {u.status === 'BLOCKED' && <Badge tone="danger">Blocked</Badge>}</h1>
          <p className="muted">@{u.username}</p>
          <p className="contact-line">
            <span>✉ {u.email ? <a href={`mailto:${u.email}`}>{u.email}</a> : '—'}</span>
            <span>✆ {u.mobile ? <a href={`tel:+91${u.mobile}`}>{u.mobile}</a> : '—'}</span>
          </p>
          <p className="muted small">Joined {fmtDate(u.createdAt, false)} · Last active {timeAgo(u.lastActiveAt)}</p>
        </div>
        {String(u.id) !== String(me.id) && (
          <button className={`btn ${u.status === 'ACTIVE' ? 'btn-danger' : ''}`} onClick={toggleStatus} disabled={busy}>
            {u.status === 'ACTIVE' ? 'Block user' : 'Unblock user'}
          </button>
        )}
      </section>
      <ErrorBox message={error} />

      <dl className="stat-strip">
        <div><dt>Tests attempted</dt><dd>{stats.testsAttempted}</dd></div>
        <div><dt>Total attempts</dt><dd>{stats.totalAttempts}</dd>{stats.inProgress > 0 && <small>{stats.inProgress} running</small>}</div>
        <div><dt>Average</dt><dd>{stats.averagePercentage == null ? '—' : `${fmtNum(stats.averagePercentage)}%`}</dd></div>
        <div>
          <dt>Highest</dt>
          <dd>{stats.highestPercentage == null ? '—' : `${fmtNum(stats.highestPercentage)}%`}</dd>
          {stats.highestScore && <small>{fmtNum(stats.highestScore.score)}/{fmtNum(stats.highestScore.totalMarks)} in {stats.highestScore.testTitle}</small>}
        </div>
      </dl>

      {subjectWise.length > 0 && (
        <section className="panel">
          <h2>Subject-wise performance</h2>
          <ul className="subject-bars">
            {subjectWise.map((s) => (
              <li key={s.subject}>
                <span className="subject-name">{s.subject}</span>
                <span className="meter"><span style={{ width: `${Math.max(0, Math.min(100, s.average))}%` }} /></span>
                <span className="num">{fmtNum(s.average)}%</span>
                <span className="muted small">{s.attempts} attempt(s)</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="stack">
        <h2>Test history</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Test</th><th>Date</th><th className="num">Score</th><th className="num">%</th><th className="num">Time</th><th /></tr></thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td><div className="cell-title">{a.test.title}</div><div className="muted small">{a.test.subject}</div></td>
                  <td>{fmtDate(a.submittedAt || a.startedAt)}</td>
                  {a.status === 'SUBMITTED' ? (
                    <>
                      <td className="num">{fmtNum(a.score)} / {fmtNum(a.totalMarks)}</td>
                      <td className="num">{fmtNum(a.percentage)}%</td>
                      <td className="num">{fmtDuration(a.timeTaken)}{a.autoSubmitted && <span className="muted small"> (auto)</span>}</td>
                      <td className="row-actions"><Link to={`/result/${a.id}`}>Result</Link><Link to={`/review/${a.id}`}>Review</Link></td>
                    </>
                  ) : (
                    <td colSpan={4}><Badge tone="warn">In progress</Badge></td>
                  )}
                </tr>
              ))}
              {attempts.length === 0 && <tr><td colSpan={6} className="muted">No attempts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
