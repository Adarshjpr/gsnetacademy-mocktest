import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox, Loader } from '../components/UI.jsx';
import { fmtDate, fmtDuration, fmtNum } from '../utils/format.js';
import { useLang } from '../context/LangContext.jsx';

export default function Result() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const r = t.result;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api(`/attempts/${attemptId}`)
      .then((d) => {
        if (d.mode === 'exam') navigate(`/exam/${attemptId}`, { replace: true });
        else setData(d);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [attemptId]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loader label={r.calculating} />;
  if (data.mode === 'in-progress') return <div className="alert alert-info">{r.running}</div>;

  const { attempt: a, test, rank, totalParticipants, user } = data;
  const n = a.totalQuestions || 1;
  const seg = (x) => `${(x / n) * 100}%`;

  return (
    <div className="result stack-lg">
      <Link to="/my-tests" className="back-link">{r.back}</Link>
      {(a.autoSubmitted || location.state?.auto) && (
        <div className="alert alert-info">{r.auto}</div>
      )}

      <section className="result-head">
        <div>
          <p className="muted small">{user.name || user.username} · {r.submitted} {fmtDate(a.submittedAt)}</p>
          <h1>{test.title}</h1>
        </div>
        <div className="scoreline">
          <span className="score-big">{fmtNum(a.score)}</span>
          <span className="score-total">/ {fmtNum(a.totalMarks)}</span>
          <span className="score-rank">
            {r.rank} <b>#{rank}</b> {r.of} {totalParticipants}
          </span>
        </div>
      </section>

      <div className="answer-bar" aria-label="Answer breakdown">
        <span className="seg seg-correct" style={{ width: seg(a.correctCount) }} />
        <span className="seg seg-wrong" style={{ width: seg(a.wrongCount) }} />
        <span className="seg seg-skip" style={{ width: seg(a.unattemptedCount) }} />
      </div>

      <dl className="result-grid">
        <div className="r-correct"><dt>{r.correct}</dt><dd>{a.correctCount}</dd><small>+{fmtNum(a.correctCount * a.marksPerQuestion)} {r.marks}</small></div>
        <div className="r-wrong"><dt>{r.wrong}</dt><dd>{a.wrongCount}</dd><small>−{fmtNum(a.wrongCount * a.negativeMarking)} {r.marks}</small></div>
        <div><dt>{r.skipped}</dt><dd>{a.unattemptedCount}</dd><small>0 {r.marks}</small></div>
        <div><dt>{r.accuracy}</dt><dd>{fmtNum(a.accuracy)}%</dd><small>{r.accNote}</small></div>
        <div><dt>{r.percentage}</dt><dd>{fmtNum(a.percentage)}%</dd><small>{r.pctNote}</small></div>
        <div><dt>{r.time}</dt><dd>{fmtDuration(a.timeTaken)}</dd><small>&nbsp;</small></div>
      </dl>

      <div className="button-row">
        <Link className="btn btn-primary" to={`/review/${a.id}`}>{r.review}</Link>
        <Link className="btn" to={`/leaderboard/${test.id}`}>{r.leaderboard}</Link>
        <Link className="btn btn-ghost" to={`/tests/${test.id}`}>{r.again}</Link>
      </div>
    </div>
  );
}
