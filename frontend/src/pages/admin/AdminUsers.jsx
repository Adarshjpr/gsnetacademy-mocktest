import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../../api.js';
import { Badge, Empty, ErrorBox, Loader, Pager, useDebounced } from '../../components/UI.jsx';
import { fmtDate, fmtNum, timeAgo } from '../../utils/format.js';

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const dq = useDebounced(q);

  useEffect(() => setPage(1), [dq, status]);
  useEffect(() => {
    const ctrl = new AbortController();
    setError('');
    api(`/admin/users${qs({ q: dq, status, page, limit: 20 })}`, { signal: ctrl.signal })
      .then(setData)
      .catch((e) => e.name !== 'AbortError' && setError(e.message));
    return () => ctrl.abort();
  }, [dq, status, page]);

  return (
    <div className="stack-lg">
      <div className="section-head">
        <h1>Users</h1>
        {data && <span className="muted">{data.total} total</span>}
      </div>
      <div className="filters">
        <input type="search" placeholder="Search by name, username, email or mobile" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOCKED">Blocked</option>
        </select>
      </div>
      <ErrorBox message={error} />
      {!data ? <Loader /> : data.users.length === 0 ? (
        <Empty title="No users found" />
      ) : (
        <ul className="people">
          {data.users.map((u) => (
            <li key={u.id}>
              <Link to={`/admin/users/${u.id}`} className="person">
                <span className="avatar avatar-lg">{u.username[0].toUpperCase()}</span>
                <span className="person-main">
                  <span className="person-name">
                    {u.username}
                    {u.name && <span className="muted"> · {u.name}</span>}
                    {u.role === 'ADMIN' && <Badge tone="info">Admin</Badge>}
                    {u.status === 'BLOCKED' && <Badge tone="danger">Blocked</Badge>}
                  </span>
                  <span className="person-meta">
                    {[u.email, u.mobile].filter(Boolean).join(' · ')}
                  </span>
                  <span className="person-meta">
                    Tests: <b>{u.testsAttempted}</b> · Attempts: <b>{u.totalAttempts}</b> · Avg: <b>{u.averagePercentage == null ? '—' : `${fmtNum(u.averagePercentage)}%`}</b> · Best: <b>{u.highestPercentage == null ? '—' : `${fmtNum(u.highestPercentage)}%`}</b>
                  </span>
                </span>
                <span className="person-side">
                  <span className={`presence ${u.lastActiveAt && Date.now() - new Date(u.lastActiveAt) < 15 * 60 * 1000 ? 'online' : ''}`}>{timeAgo(u.lastActiveAt)}</span>
                  <span className="muted small">Joined {fmtDate(u.createdAt, false)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
    </div>
  );
}
