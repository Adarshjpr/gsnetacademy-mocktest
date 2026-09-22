import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LanguageSwitch from '../components/LanguageSwitch.jsx';
import { Logo } from '../components/Layout.jsx';
import { ErrorBox, Modal, PageLoader } from '../components/UI.jsx';
import { LABELS, fmtClock, fmtNum, pick } from '../utils/format.js';
import { T } from '../utils/i18n.js';

/** Palette status for one question */
function statusOf(a) {
  const answered = a?.selectedAnswer !== null && a?.selectedAnswer !== undefined;
  if (a?.markedForReview) return answered ? 'answered-marked' : 'marked';
  if (answered) return 'answered';
  if (a?.visited) return 'not-answered';
  return 'not-visited';
}

export default function Exam() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loadState, setLoadState] = useState({ loading: true, error: '' });
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // questionId -> { selectedAnswer, markedForReview, visited }
  const [current, setCurrent] = useState(0);
  const [lang, setLang] = useState(() => localStorage.getItem(`lang:${attemptId}`) || localStorage.getItem('examLang') || user?.language || 'hi');
  const [remaining, setRemaining] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [hint, setHint] = useState('');

  const expiresAtRef = useRef(0);
  const clockOffsetRef = useRef(0); // server time - client time
  const submittedRef = useRef(false);
  const failedSavesRef = useRef(new Map()); // questionId -> patch waiting for retry
  const inFlightRef = useRef(0);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const t = T[lang];

  /* ---------- load (also used to resume after refresh) ---------- */
  useEffect(() => {
    let alive = true;
    api(`/attempts/${attemptId}`)
      .then((d) => {
        if (!alive) return;
        if (d.mode !== 'exam') {
          navigate(`/result/${attemptId}`, { replace: true });
          return;
        }
        clockOffsetRef.current = new Date(d.serverNow).getTime() - Date.now();
        expiresAtRef.current = new Date(d.attempt.expiresAt).getTime();
        const map = {};
        d.attempt.answers.forEach((a) => {
          map[a.questionId] = { selectedAnswer: a.selectedAnswer, markedForReview: a.markedForReview, visited: a.visited };
        });
        setTest(d.test);
        setQuestions(d.questions);
        setAnswers(map);
        const saved = Number(localStorage.getItem(`q:${attemptId}`));
        if (Number.isInteger(saved) && saved >= 0 && saved < d.questions.length) setCurrent(saved);
        if (d.test.language === 'EN') setLang('en');
        if (d.test.language === 'HI') setLang('hi');
        setLoadState({ loading: false, error: '' });
      })
      .catch((e) => alive && setLoadState({ loading: false, error: e.message }));
    return () => {
      alive = false;
    };
  }, [attemptId, navigate]);

  /* ---------- submit ---------- */
  const doSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setSubmitError('');
      // Send every answer again so nothing is lost if an autosave failed
      const payload = Object.entries(answersRef.current).map(([questionId, a]) => ({
        questionId,
        selectedAnswer: a.selectedAnswer ?? null,
        markedForReview: !!a.markedForReview,
      }));
      try {
        await api(`/attempts/${attemptId}/submit`, { method: 'POST', body: { answers: payload } });
      } catch (e) {
        // On auto-submit the server finalizes the attempt anyway, so continue to the result
        if (!auto && e.status !== 409) {
          submittedRef.current = false;
          setSubmitting(false);
          setSubmitError(`${e.message} Your answers are safe — try submitting again.`);
          return;
        }
      }
      localStorage.removeItem(`q:${attemptId}`);
      navigate(`/result/${attemptId}`, { replace: true, state: { auto } });
    },
    [attemptId, navigate]
  );

  /* ---------- timer (based on server expiry, not a local countdown) ---------- */
  useEffect(() => {
    if (loadState.loading || loadState.error) return undefined;
    const tick = () => {
      const secs = Math.round((expiresAtRef.current - (Date.now() + clockOffsetRef.current)) / 1000);
      setRemaining(Math.max(0, secs));
      if (secs <= 0) doSubmit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loadState, doSubmit]);

  /* ---------- autosave ---------- */
  const persist = useCallback(
    async (questionId, patch) => {
      if (submittedRef.current) return;
      inFlightRef.current += 1;
      setSaveStatus('saving');
      try {
        await api(`/attempts/${attemptId}/answer`, { method: 'POST', body: { questionId, ...patch } });
        failedSavesRef.current.delete(questionId);
        inFlightRef.current -= 1;
        if (!inFlightRef.current) setSaveStatus(failedSavesRef.current.size ? 'error' : 'saved');
      } catch (e) {
        inFlightRef.current -= 1;
        if (e.status === 409) {
          // Time over or already submitted on another tab
          submittedRef.current = true;
          navigate(`/result/${attemptId}`, { replace: true });
          return;
        }
        const prev = failedSavesRef.current.get(questionId) || {};
        failedSavesRef.current.set(questionId, { ...prev, ...patch });
        setSaveStatus('error');
      }
    },
    [attemptId, navigate]
  );

  useEffect(() => {
    const id = setInterval(() => {
      for (const [qid, patch] of failedSavesRef.current) persist(qid, patch);
    }, 8000);
    return () => clearInterval(id);
  }, [persist]);

  const update = useCallback(
    (questionId, patch) => {
      setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
      persist(questionId, patch);
    },
    [persist]
  );

  /* ---------- navigation ---------- */
  const q = questions[current];

  useEffect(() => {
    if (!q) return;
    localStorage.setItem(`q:${attemptId}`, String(current));
    if (!answersRef.current[q.id]?.visited) update(q.id, { visited: true });
    setPaletteOpen(false);
    setHint('');
  }, [q, current, attemptId, update]);

  useEffect(() => {
    const warn = (e) => {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const changeLang = (l) => {
    setLang(l); // only the display changes — answers, position and timer stay as they are
    localStorage.setItem(`lang:${attemptId}`, l);
    localStorage.setItem('examLang', l);
  };

  const goTo = (i) => setCurrent(Math.min(Math.max(i, 0), questions.length - 1));
  const isLast = current === questions.length - 1;

  const counts = useMemo(() => {
    const c = { answered: 0, 'not-answered': 0, 'not-visited': 0, marked: 0, 'answered-marked': 0 };
    questions.forEach((qq) => {
      c[statusOf(answers[qq.id])] += 1;
    });
    return c;
  }, [questions, answers]);

  if (loadState.loading) return <PageLoader />;
  if (loadState.error)
    return (
      <div className="center-page">
        <ErrorBox message={loadState.error} onRetry={() => window.location.reload()} />
      </div>
    );
  if (!q) return <div className="center-page">This test has no questions.</div>;

  const a = answers[q.id] || {};
  const options = pick(q.options, lang) || [];
  const lowTime = remaining !== null && remaining <= 300;

  const displayName = user.name || user.username;
  const answeredNow = a.selectedAnswer !== null && a.selectedAnswer !== undefined;

  /* NTA button behaviour */
  const next = () => goTo(isLast ? 0 : current + 1);
  const saveAndNext = () => {
    setHint('');
    if (a.markedForReview) update(q.id, { markedForReview: false });
    next();
  };
  const saveAndMark = () => {
    if (!answeredNow) return setHint(t.selectFirst);
    setHint('');
    update(q.id, { markedForReview: true });
    next();
  };
  const markAndNext = () => {
    setHint('');
    update(q.id, { markedForReview: true });
    next();
  };

  return (
    <div className="exam">
      <header className="exam-top">
        <div className="exam-brand">
          <Logo />
          <span className="brand-name">GS Net Academy</span>
          <span className="exam-brand-sub">Computer Based Test</span>
        </div>
        <LanguageSwitch value={lang} onChange={changeLang} disabled={test.language !== 'BILINGUAL'} compact />
      </header>

      <div className="candidate-bar">
        <span className="candidate-photo" aria-hidden="true">{displayName[0].toUpperCase()}</span>
        <dl className="candidate-info">
          <div><dt>{t.candidate}</dt><dd>{displayName}</dd></div>
          <div><dt>{t.examName}</dt><dd className="exam-title">{test.exam || test.title}</dd></div>
          <div className="hide-sm"><dt>{t.subjectName}</dt><dd>{test.subject || test.title}</dd></div>
        </dl>
        <div className={`timer ${lowTime ? 'timer-low' : ''}`} role="timer" aria-live={lowTime ? 'polite' : 'off'}>
          <span>{t.timeLeft}</span>
          <strong>{fmtClock(remaining ?? 0)}</strong>
        </div>
      </div>

      <div className="exam-body">
        <section className="question-pane" aria-labelledby="q-title">
          <div className="question-head">
            <h1 id="q-title">
              {t.question} {current + 1}
              <span className="of"> / {questions.length}</span>
            </h1>
            <span className="marking">
              {t.marks}: <b className="plus">+{fmtNum(test.marksPerQuestion)}</b> {test.negativeMarking > 0 && <b className="minus">−{fmtNum(test.negativeMarking)}</b>}
            </span>
            <span className={`save-state save-${saveStatus}`} aria-live="polite">
              {saveStatus === 'saving' ? t.saving : saveStatus === 'saved' ? t.saved : saveStatus === 'error' ? t.saveFailed : ''}
            </span>
            <button className="btn btn-small palette-toggle" onClick={() => setPaletteOpen(true)}>
              {t.palette} ({counts.answered + counts['answered-marked']}/{questions.length})
            </button>
          </div>

          <div className="question-scroll">
            <p className="question-text" lang={lang}>{pick(q.question, lang)}</p>
            <div className="options" role="radiogroup" aria-labelledby="q-title">
              {options.map((opt, i) => (
                <label key={i} className={`option ${a.selectedAnswer === i ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={a.selectedAnswer === i}
                    onChange={() => { setHint(''); update(q.id, { selectedAnswer: i }); }}
                  />
                  <span className="option-radio" aria-hidden="true" />
                  <span className="option-key">{LABELS[i]}.</span>
                  <span className="option-text" lang={lang}>{opt}</span>
                </label>
              ))}
            </div>
            {hint && <p className="exam-hint" role="alert">{hint}</p>}
          </div>

          <footer className="exam-footer">
            <div className="footer-row">
              <button className="btn nta-green" onClick={saveAndNext}>{t.saveNext}</button>
              <button className="btn nta-orange" onClick={saveAndMark}>{t.saveMarkReview}</button>
              <button className="btn nta-white" onClick={() => { setHint(''); update(q.id, { selectedAnswer: null }); }} disabled={!answeredNow}>
                {t.clear}
              </button>
              <button className="btn nta-blue" onClick={markAndNext}>{t.markNext}</button>
            </div>
            <div className="footer-row footer-nav">
              <button className="btn nta-white" onClick={() => goTo(current - 1)} disabled={current === 0}>« {t.back}</button>
              <button className="btn nta-white" onClick={() => goTo(current + 1)} disabled={isLast}>{t.next} »</button>
              <button className="btn nta-green footer-submit" onClick={() => setConfirmOpen(true)}>{t.submit}</button>
            </div>
          </footer>
        </section>

        {paletteOpen && <div className="palette-scrim" onClick={() => setPaletteOpen(false)} />}
        <aside className={`palette ${paletteOpen ? 'open' : ''}`} aria-label={t.palette}>
          <div className="palette-user">
            <span className="avatar">{displayName[0].toUpperCase()}</span>
            <span>{displayName}</span>
            <button className="icon-btn palette-close" onClick={() => setPaletteOpen(false)} aria-label="Close">×</button>
          </div>
          <ul className="legend">
            <li><span className="pal pal-not-visited">{counts['not-visited']}</span>{t.notVisited}</li>
            <li><span className="pal pal-not-answered">{counts['not-answered']}</span>{t.notAnswered}</li>
            <li><span className="pal pal-answered">{counts.answered}</span>{t.answered}</li>
            <li><span className="pal pal-marked">{counts.marked}</span>{t.marked}</li>
            <li className="legend-wide">
              <span className="pal pal-answered-marked">{counts['answered-marked']}</span>
              <span>{t.answeredMarked} <em className="muted">({t.evaluated})</em></span>
            </li>
          </ul>
          <h2 className="palette-title">{t.chooseQuestion}</h2>
          <div className="palette-grid">
            {questions.map((qq, i) => {
              const st = statusOf(answers[qq.id]);
              return (
                <button
                  key={qq.id}
                  className={`pal pal-${st} ${i === current ? 'is-current' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`${t.question} ${i + 1}`}
                  aria-current={i === current ? 'true' : undefined}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button className="btn nta-green btn-block palette-submit" onClick={() => setConfirmOpen(true)}>
            {t.submit}
          </button>
        </aside>
      </div>

      {confirmOpen && (
        <Modal title={lang === 'hi' ? 'टेस्ट सबमिट करें?' : 'Submit the test?'} onClose={submitting ? undefined : () => setConfirmOpen(false)}>
          <table className="summary-table">
            <tbody>
              <tr><th>{lang === 'hi' ? 'कुल प्रश्न' : 'Total questions'}</th><td>{questions.length}</td></tr>
              <tr><th>{t.answered}</th><td>{counts.answered + counts['answered-marked']}</td></tr>
              <tr><th>{t.notAnswered}</th><td>{counts['not-answered'] + counts.marked}</td></tr>
              <tr><th>{t.marked}</th><td>{counts.marked + counts['answered-marked']}</td></tr>
              <tr><th>{t.notVisited}</th><td>{counts['not-visited']}</td></tr>
              <tr><th>{t.timeLeft}</th><td>{fmtClock(remaining ?? 0)}</td></tr>
            </tbody>
          </table>
          <p className="muted small">
            {lang === 'hi'
              ? 'सबमिट करने के बाद आप उत्तर नहीं बदल सकेंगे।'
              : 'You will not be able to change answers after submitting.'}
          </p>
          <ErrorBox message={submitError} />
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              {lang === 'hi' ? 'वापस जाएँ' : 'Back to test'}
            </button>
            <button className="btn btn-primary" onClick={() => doSubmit(false)} disabled={submitting}>
              {submitting ? (lang === 'hi' ? 'सबमिट हो रहा है…' : 'Submitting…') : t.submit}
            </button>
          </div>
        </Modal>
      )}

      {submitting && !confirmOpen && (
        <div className="modal-backdrop">
          <div className="modal"><div className="modal-body">{lang === 'hi' ? 'समय समाप्त। टेस्ट सबमिट हो रहा है…' : 'Time is over. Submitting your test…'}</div></div>
        </div>
      )}
    </div>
  );
}
