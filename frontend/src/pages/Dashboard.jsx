import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Empty, ErrorBox, Loader, useDebounced } from '../components/UI.jsx';
import { fmtDate, fmtNum } from '../utils/format.js';
import { useLang } from '../context/LangContext.jsx';

const TABS = ['', 'PYQ', 'PRACTICE', 'MOCK'];

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const d = t.dash;
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ category: '', subject: '', exam: '', difficulty: '', language: '' });
  const [options, setOptions] = useState({ subjects: [], exams: [] });
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedQ = useDebounced(q);

  useEffect(() => {
    api('/tests/filters').then(setOptions).catch(() => {});
    api('/attempts/my').then((d) => setAttempts(d.attempts)).catch(() => {});
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError('');
    api(`/tests${qs({ q: debouncedQ, ...filters })}`, { signal: ctrl.signal })
      .then((d) => setTests(d.tests))
      .catch((e) => e.name !== 'AbortError' && setError(e.message))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [debouncedQ, filters]);

  const stats = useMemo(() => {
    const done = attempts.filter((a) => a.status === 'SUBMITTED');
    const avg = done.length ? done.reduce((s, a) => s + a.percentage, 0) / done.length : null;
    const best = done.reduce((m, a) => (m == null || a.percentage > m ? a.percentage : m), null);
    return { count: done.length, avg, best };
  }, [attempts]);

  const running = attempts.filter((a) => a.status === 'IN_PROGRESS');
  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div className="stack-lg">
      <section className="welcome">
        <div>
          <h1>{d.hello}, {user.name || user.username} 🙏</h1>
          <p className="muted">{d.intro}</p>
          <p className="small">{d.newHere} <Link to="/help">{d.newHereLink}</Link></p>
        </div>
        <dl className="welcome-stats">
          <div><dt>{d.taken}</dt><dd>{stats.count}</dd></div>
          <div><dt>{d.average}</dt><dd>{stats.avg == null ? '—' : `${fmtNum(Math.round(stats.avg * 10) / 10)}%`}</dd></div>
          <div><dt>{d.best}</dt><dd>{stats.best == null ? '—' : `${fmtNum(stats.best)}%`}</dd></div>
        </dl>
      </section>

      {running.length > 0 && (
        <div className="alert alert-info">
          <span>{d.unfinished} <strong>{running[0].test.title}</strong>. {d.timerRuns}</span>
          <Link className="btn btn-primary btn-small" to={`/exam/${running[0].id}`}>{d.resume}</Link>
        </div>
      )}

      <section className="stack">
        <div className="search-bar">
          <input type="search" placeholder={d.searchPh} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tests" />
        </div>
        <div className="tabs" role="tablist">
          {TABS.map((v) => (
            <button key={v} role="tab" aria-selected={filters.category === v} className={filters.category === v ? 'active' : ''} onClick={() => setFilters({ ...filters, category: v })}>
              {d.tabs[v]}
            </button>
          ))}
        </div>
        <div className="filters">
          <select value={filters.exam} onChange={setF('exam')} aria-label="Exam">
            <option value="">{d.allExams}</option>
            {options.exams.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select value={filters.subject} onChange={setF('subject')} aria-label="Subject">
            <option value="">{d.allSubjects}</option>
            {options.subjects.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select value={filters.difficulty} onChange={setF('difficulty')} aria-label="Difficulty">
            <option value="">{d.anyDiff}</option>
            {Object.entries(t.diff).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filters.language} onChange={setF('language')} aria-label="Language">
            <option value="">{d.anyLang}</option>
            <option value="EN">English</option>
            <option value="HI">हिंदी</option>
            <option value="BILINGUAL">{t.tlang.BILINGUAL}</option>
          </select>
        </div>

        <ErrorBox message={error} />
        {loading ? (
          <Loader label={d.finding} />
        ) : tests.length === 0 ? (
          <Empty title={d.noTests}>{d.noTestsHint}</Empty>
        ) : (
          <div className="test-grid">
            {tests.map((t) => <TestCard key={t.id} test={t} />)}
          </div>
        )}
      </section>

      {attempts.some((a) => a.status === 'SUBMITTED') && (
        <section className="stack">
          <div className="section-head">
            <h2>{d.recent}</h2>
            <Link to="/my-tests">{d.seeAll}</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{d.th.test}</th><th>{d.th.score}</th><th>{d.th.rank}</th><th>{d.th.date}</th><th /></tr></thead>
              <tbody>
                {attempts.filter((a) => a.status === 'SUBMITTED').slice(0, 5).map((a) => (
                  <tr key={a.id}>
                    <td>{a.test.title}</td>
                    <td className="num">{fmtNum(a.score)} / {fmtNum(a.totalMarks)}</td>
                    <td className="num">#{a.rank}</td>
                    <td>{fmtDate(a.submittedAt)}</td>
                    <td className="row-actions"><Link to={`/result/${a.id}`}>{d.result}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function TestCard({ test }) {
  const { t } = useLang();
  const d = t.dash;
  return (
    <article className="test-card">
      <div className="test-card-top">
        <span className="tag">{t.cat[test.category]}</span>
        {test.exam && <span className="tag tag-plain">{test.exam}</span>}
        <span className={`diff diff-${test.difficulty.toLowerCase()}`}>{t.diff[test.difficulty]}</span>
      </div>
      <h3>{test.title}</h3>
      {test.subject && <p className="muted small">{test.subject} · {t.tlang[test.language]}</p>}
      <dl className="test-facts">
        <div><dt>{d.questions}</dt><dd>{test.totalQuestions}</dd></div>
        <div><dt>{d.minutes}</dt><dd>{test.duration}</dd></div>
        <div><dt>{d.marks}</dt><dd>{fmtNum(test.totalMarks)}</dd></div>
        <div><dt>{d.negative}</dt><dd>{test.negativeMarking ? `−${fmtNum(test.negativeMarking)}` : d.none}</dd></div>
      </dl>
      <div className="test-card-actions">
        <Link className="btn btn-primary" to={`/tests/${test.id}`}>{d.start}</Link>
        <Link className="btn btn-ghost" to={`/leaderboard/${test.id}`}>{d.leaderboard}</Link>
      </div>
    </article>
  );
}
