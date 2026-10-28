import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Badge, Empty, ErrorBox, Loader } from '../components/UI.jsx';
import { fmtDate, fmtDuration, fmtNum } from '../utils/format.js';
import { useLang } from '../context/LangContext.jsx';

export default function MyTests() {
  const { t } = useLang();
  const m = t.my;
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api('/attempts/my').then((d) => setAttempts(d.attempts)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!attempts) return <Loader />;

  return (
    <div className="stack-lg">
      <h1>{m.title}</h1>
      {attempts.length === 0 ? (
        <Empty title={m.none}>
          <Link className="btn btn-primary" to="/">{m.browse}</Link>
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{m.th.test}</th><th>{m.th.date}</th><th className="num">{m.th.score}</th><th className="num">%</th><th className="num">{m.th.time}</th><th className="num">{m.th.rank}</th><th /></tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="cell-title">{a.test.title}</div>
                    <div className="muted small">{a.test.subject}</div>
                  </td>
                  <td>{fmtDate(a.submittedAt || a.startedAt)}</td>
                  {a.status === 'SUBMITTED' ? (
                    <>
                      <td className="num">{fmtNum(a.score)} / {fmtNum(a.totalMarks)}</td>
                      <td className="num">{fmtNum(a.percentage)}%</td>
                      <td className="num">{fmtDuration(a.timeTaken)}</td>
                      <td className="num">#{a.rank} <span className="muted small">/ {a.totalParticipants}</span></td>
                      <td className="row-actions">
                        <Link to={`/result/${a.id}`}>{m.result}</Link>
                        <Link to={`/review/${a.id}`}>{m.review}</Link>
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={4}><Badge tone="warn">{m.inProgress}</Badge></td>
                      <td className="row-actions"><Link to={`/exam/${a.id}`}>{m.resume}</Link></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
