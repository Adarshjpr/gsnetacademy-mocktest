import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox, Loader } from '../components/UI.jsx';
import LanguageSwitch from '../components/LanguageSwitch.jsx';
import { LABELS, fmtNum, pick } from '../utils/format.js';
import { T } from '../utils/i18n.js';

const FILTERS = [
  ['ALL', 'All', 'सभी'],
  ['WRONG', 'Wrong', 'गलत'],
  ['CORRECT', 'Correct', 'सही'],
  ['UNATTEMPTED', 'Unattempted', 'छोड़े गए'],
];
const STATUS_TEXT = {
  en: { CORRECT: 'Correct', WRONG: 'Wrong', UNATTEMPTED: 'Unattempted' },
  hi: { CORRECT: 'सही', WRONG: 'गलत', UNATTEMPTED: 'छोड़ा गया' },
};

export default function Review() {
  const { attemptId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [lang, setLang] = useState(() => localStorage.getItem(`lang:${attemptId}`) || localStorage.getItem('examLang') || 'en');

  const load = () => {
    setError('');
    api(`/attempts/${attemptId}/review`).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [attemptId]);

  const counts = useMemo(() => {
    const c = { ALL: 0, CORRECT: 0, WRONG: 0, UNATTEMPTED: 0 };
    data?.questions.forEach((q) => {
      c.ALL += 1;
      c[q.status] += 1;
    });
    return c;
  }, [data]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loader />;

  const list = data.questions.filter((q) => filter === 'ALL' || q.status === filter);

  return (
    <div className="stack-lg">
      <Link to={`/result/${attemptId}`} className="back-link">{lang === 'hi' ? '← परिणाम' : '← Result'}</Link>
      <div className="section-head">
        <div>
          <h1>{lang === 'hi' ? 'उत्तरों की समीक्षा' : 'Answer review'}</h1>
          <p className="muted">{data.test.title} · {fmtNum(data.attempt.score)} / {fmtNum(data.attempt.totalMarks)}</p>
        </div>
        <LanguageSwitch value={lang} onChange={setLang} disabled={data.test.language !== 'BILINGUAL'} />
      </div>

      <div className="tabs" role="tablist">
        {FILTERS.map(([key, en, hi]) => (
          <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>
            {lang === 'hi' ? hi : en} <span className="count">{counts[key]}</span>
          </button>
        ))}
      </div>

      {list.length === 0 && <p className="muted">{lang === 'hi' ? 'इस समूह में कोई प्रश्न नहीं है।' : 'No questions in this group.'}</p>}
      <div className="stack">
        {list.map((q) => <ReviewCard key={q.id} q={q} lang={lang} />)}
      </div>
    </div>
  );
}

function ReviewCard({ q, lang }) {
  const t = T[lang];
  const options = pick(q.options, lang) || [];
  const exp = q.explanation?.[lang]?.correct ? q.explanation[lang] : q.explanation?.[lang === 'en' ? 'hi' : 'en'] || {};
  const optExp = (i) => exp.options?.[i] || '';
  const sel = q.selectedAnswer;
  const ca = q.correctAnswer;

  return (
    <article className={`review-card rv-${q.status.toLowerCase()}`} lang={lang}>
      <header className="review-head">
        <span className="review-num">{t.question} {q.number}</span>
        <span className={`badge badge-${q.status === 'CORRECT' ? 'success' : q.status === 'WRONG' ? 'danger' : 'neutral'}`}>
          {STATUS_TEXT[lang][q.status]}
        </span>
      </header>
      <p className="question-text">{pick(q.question, lang)}</p>
      <ul className="review-options">
        {options.map((o, i) => {
          const cls = i === ca ? 'is-correct' : i === sel ? 'is-wrong' : '';
          return (
            <li key={i} className={cls}>
              <span className="option-key">{LABELS[i]}</span>
              <span className="option-text">{o}</span>
              <span className="option-tags">
                {i === sel && <em>{t.yourAnswer}</em>}
                {i === ca && <em>{t.correctAnswer}</em>}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="answer-lines">
        <div>
          <span>{t.yourAnswer}:</span>{' '}
          <b className={q.status === 'CORRECT' ? 'txt-success' : q.status === 'WRONG' ? 'txt-danger' : ''}>
            {sel == null ? t.notAttempted : `${LABELS[sel]}. ${options[sel]}`}
          </b>
        </div>
        <div>
          <span>{t.correctAnswer}:</span> <b className="txt-success">{LABELS[ca]}. {options[ca]}</b>
        </div>
      </div>

      <div className="explain">
        {q.status === 'WRONG' && optExp(sel) && (
          <section className="exp exp-wrong">
            <h3>{t.whyWrong(LABELS[sel])}</h3>
            <p>{optExp(sel)}</p>
          </section>
        )}
        <section className="exp exp-right">
          <h3>{t.whyRight(LABELS[ca])}</h3>
          <p>{exp.correct}</p>
          {optExp(ca) && optExp(ca) !== exp.correct && <p>{optExp(ca)}</p>}
        </section>
        {exp.options?.some(Boolean) && (
          <details className="all-options">
            <summary>{t.allOptions}</summary>
            <ul>
              {exp.options.map((e, i) => e && (
                <li key={i}><b>{LABELS[i]}.</b> {e}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}
