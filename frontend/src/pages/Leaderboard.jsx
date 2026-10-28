import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Empty, ErrorBox, Loader } from '../components/UI.jsx';
import { fmtDate, fmtDuration, fmtNum } from '../utils/format.js';
import { useLang } from '../context/LangContext.jsx';

export default function Leaderboard() {
  const { testId } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const l = t.lb;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api(`/leaderboard/test/${testId}?limit=200`).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [testId]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loader />;

  return (
    <div className="stack-lg">
      <Link to={`/tests/${testId}`} className="back-link">{l.back}</Link>
      <div className="section-head">
        <div>
          <h1>{l.title}</h1>
          <p className="muted">{data.test.title} · {data.totalParticipants} {l.participants} · {l.bestAttempt}</p>
        </div>
      </div>

      {data.me && (
        <div className="my-rank">
          <span>{l.yourRank}</span>
          <b>#{data.me.rank}</b>
          <span>{fmtNum(data.me.score)} / {fmtNum(data.me.totalMarks)} · {l.in} {fmtDuration(data.me.timeTaken)}</span>
        </div>
      )}

      {data.entries.length === 0 ? (
        <Empty title={l.none}>{l.beFirst}</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table leaderboard">
            <thead>
              <tr><th>{l.th.rank}</th><th>{l.th.student}</th><th className="num">{l.th.score}</th><th className="num">{l.th.time}</th><th>{l.th.submitted}</th></tr>
            </thead>
            <tbody>
              {data.entries.map((e) => {
                const mine = String(e.userId) === String(user.id);
                return (
                  <tr key={e.userId} className={mine ? 'row-me' : ''}>
                    <td><span className={`rank rank-${e.rank <= 3 ? e.rank : 'n'}`}>{e.rank}</span></td>
                    <td>{e.username}{mine && <span className="you">{l.you}</span>}</td>
                    <td className="num">{fmtNum(e.score)} / {fmtNum(e.totalMarks)}</td>
                    <td className="num">{fmtDuration(e.timeTaken)}</td>
                    <td>{fmtDate(e.submittedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">{l.ties}</p>
    </div>
  );
}
