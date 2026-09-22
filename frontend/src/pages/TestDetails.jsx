import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox, Loader } from '../components/UI.jsx';
import { useLang } from '../context/LangContext.jsx';
import { Logo } from '../components/Layout.jsx';
import { fmtNum } from '../utils/format.js';

/** A small worked example built from this test's own numbers */
function example(test) {
  const n = Math.max(test.totalQuestions, 1);
  const attempted = Math.max(1, Math.ceil(n * 0.8));
  const correct = Math.max(1, Math.ceil(attempted * 0.75));
  const wrong = attempted - correct;
  const skipped = n - attempted;
  const score = Math.round((correct * test.marksPerQuestion - wrong * test.negativeMarking) * 100) / 100;
  return { n, attempted, correct, wrong, skipped, score };
}

/** NTA-style bilingual instruction text */
const TXT = {
  en: {
    title: 'General Instructions',
    banner: 'GENERAL INSTRUCTIONS',
    subtitle: 'Please read the instructions carefully',
    langNote: 'Please note all questions will appear in your default language. This language can be changed for a particular question later on.',
    back: 'Previous',
    chooseLang: 'Choose Your Default Language',
    glance: 'Test at a glance',
    rows: { questions: 'Total questions', duration: 'Duration', marks: 'Maximum marks', right: 'Correct answer', wrong: 'Wrong answer', blank: 'Not answered', language: 'Language' },
    general: 'General instructions',
    g: (t) => [
      <>Total duration of the test is <b>{t.duration} minutes</b>.</>,
      <>The test has <b>{t.totalQuestions} questions</b>. Every question has <b>4 options</b> and only <b>one</b> is correct.</>,
      <>The clock is set on the server. The countdown timer at the top right of the screen shows the time left. It keeps running even if you refresh or close the browser.</>,
      <>When the timer reaches zero, the test ends and is <b>submitted automatically</b> with your saved answers. You do not need to click Submit.</>,
    ],
    palette: 'Question palette — what the colours mean',
    paletteIntro: 'The Question Palette on the right side of the screen shows the status of each question with one of these symbols:',
    sym: {
      'not-visited': 'You have not visited the question yet.',
      'not-answered': 'You have visited but not answered the question.',
      answered: 'You have answered the question.',
      marked: 'You have NOT answered but have marked the question for review.',
      'answered-marked': 'You have answered and marked the question for review. It WILL be considered for evaluation.',
    },
    reviewNote: '"Marked for Review" only reminds you to look at the question again. If a marked question has an answer, that answer is counted.',
    nav: 'Navigating to a question',
    n: [
      <>Click a question number in the palette to go straight to that question.</>,
      <>Click <b className="k-green">Save &amp; Next</b> to save your answer and go to the next question.</>,
      <>Click <b className="k-blue">Mark for Review &amp; Next</b> to mark the current question for review and go to the next one.</>,
      <>Use <b>« Back</b> and <b>Next »</b> to move without changing anything.</>,
    ],
    ans: 'Answering a question',
    a: [
      <>To select an answer, click the circle before one of the options. Your choice is saved immediately.</>,
      <>To change your answer, click another option. To remove it, click <b>Clear Response</b>.</>,
      <>Click <b className="k-orange">Save &amp; Mark for Review</b> to keep your answer and mark the question to check it again later.</>,
      <>You can switch between English and हिन्दी at any time. Your answers, the question you are on and the timer do not change.</>,
    ],
    scheme: 'Marking scheme — how your score is calculated',
    formula: (t) => (t.negativeMarking > 0
      ? <>Score = (Correct × {fmtNum(t.marksPerQuestion)}) − (Wrong × {fmtNum(t.negativeMarking)})</>
      : <>Score = Correct × {fmtNum(t.marksPerQuestion)}  (no marks are cut for wrong answers)</>),
    ex: (e, t) => (
      <>
        <b>Example:</b> out of {e.n} questions you answer {e.attempted}: {e.correct} correct, {e.wrong} wrong and {e.skipped} left blank.
        <br />{t.negativeMarking > 0
          ? <>Score = ({e.correct} × {fmtNum(t.marksPerQuestion)}) − ({e.wrong} × {fmtNum(t.negativeMarking)}) = <b>{fmtNum(e.score)}</b> out of {fmtNum(t.totalMarks)}.</>
          : <>Score = {e.correct} × {fmtNum(t.marksPerQuestion)} = <b>{fmtNum(e.score)}</b> out of {fmtNum(t.totalMarks)} (the {e.wrong} wrong answers cut nothing).</>}
      </>
    ),
    tip: (t) => (t.negativeMarking > 0 ? 'Tip: wrong answers cost marks, so avoid pure guessing.' : 'There is no negative marking in this test, so attempt every question.'),
    extra: 'Test-specific instructions',
    after: 'After the test you will see your score, rank and a question-by-question review with explanations in English and Hindi.',
    declare: 'I have read and understood the instructions. I agree that I will follow them, I understand the marking scheme, and I will not use any unfair means during the test.',
    proceed: 'PROCEED — I am ready to begin',
    resume: 'Your earlier attempt of this test is still running. Resume it to continue with the time left.',
    resumeBtn: 'Resume test',
    starting: 'Starting…',
    previous: 'Previous attempts',
  },
  hi: {
    title: 'सामान्य निर्देश',
    banner: 'सामान्य निर्देश',
    subtitle: 'कृपया निर्देशों को ध्यान से पढ़ें',
    langNote: 'कृपया ध्यान दें — सभी प्रश्न आपकी चुनी हुई डिफ़ॉल्ट भाषा में दिखेंगे। परीक्षा के दौरान किसी भी प्रश्न की भाषा बाद में बदली जा सकती है।',
    back: 'पीछे',
    chooseLang: 'अपनी डिफ़ॉल्ट भाषा चुनें',
    glance: 'टेस्ट एक नज़र में',
    rows: { questions: 'कुल प्रश्न', duration: 'समय', marks: 'अधिकतम अंक', right: 'सही उत्तर', wrong: 'गलत उत्तर', blank: 'उत्तर नहीं दिया', language: 'भाषा' },
    general: 'सामान्य निर्देश',
    g: (t) => [
      <>टेस्ट की कुल अवधि <b>{t.duration} मिनट</b> है।</>,
      <>इस टेस्ट में <b>{t.totalQuestions} प्रश्न</b> हैं। हर प्रश्न के <b>4 विकल्प</b> हैं, जिनमें से केवल <b>एक</b> सही है।</>,
      <>घड़ी सर्वर पर सेट है। स्क्रीन के ऊपर दाईं ओर टाइमर शेष समय दिखाता है। ब्राउज़र रिफ्रेश या बंद करने पर भी समय चलता रहता है।</>,
      <>टाइमर शून्य होने पर टेस्ट समाप्त होकर आपके सेव किए उत्तरों के साथ <b>अपने-आप सबमिट</b> हो जाएगा। आपको सबमिट दबाने की ज़रूरत नहीं है।</>,
    ],
    palette: 'प्रश्न पैलेट — रंगों का अर्थ',
    paletteIntro: 'स्क्रीन के दाईं ओर प्रश्न पैलेट हर प्रश्न की स्थिति इन चिह्नों से दिखाता है:',
    sym: {
      'not-visited': 'आपने अभी तक यह प्रश्न नहीं देखा है।',
      'not-answered': 'आपने प्रश्न देखा है पर उत्तर नहीं दिया है।',
      answered: 'आपने प्रश्न का उत्तर दे दिया है।',
      marked: 'आपने उत्तर नहीं दिया है पर प्रश्न को समीक्षा हेतु चिह्नित किया है।',
      'answered-marked': 'आपने उत्तर दिया है और प्रश्न को समीक्षा हेतु चिह्नित किया है। इसका मूल्यांकन किया जाएगा।',
    },
    reviewNote: '"समीक्षा हेतु चिह्नित" केवल याद दिलाने के लिए है। यदि चिह्नित प्रश्न का उत्तर दिया गया है, तो वह उत्तर गिना जाएगा।',
    nav: 'किसी प्रश्न पर जाना',
    n: [
      <>पैलेट में प्रश्न संख्या पर क्लिक करके सीधे उस प्रश्न पर जाएँ।</>,
      <>उत्तर सेव करके अगले प्रश्न पर जाने के लिए <b className="k-green">सेव करें और आगे बढ़ें</b> पर क्लिक करें।</>,
      <>प्रश्न को समीक्षा हेतु चिह्नित करके आगे बढ़ने के लिए <b className="k-blue">समीक्षा हेतु चिह्नित करें और आगे बढ़ें</b> पर क्लिक करें।</>,
      <>बिना कुछ बदले आगे-पीछे जाने के लिए <b>« पीछे</b> और <b>अगला »</b> का उपयोग करें।</>,
    ],
    ans: 'प्रश्न का उत्तर देना',
    a: [
      <>उत्तर चुनने के लिए किसी विकल्प के आगे बने गोले पर क्लिक करें। आपका उत्तर तुरंत सेव हो जाता है।</>,
      <>उत्तर बदलने के लिए दूसरे विकल्प पर क्लिक करें। उत्तर हटाने के लिए <b>उत्तर हटाएँ</b> पर क्लिक करें।</>,
      <>उत्तर रखते हुए प्रश्न को दोबारा देखने के लिए <b className="k-orange">सेव करें और समीक्षा हेतु चिह्नित करें</b> पर क्लिक करें।</>,
      <>आप कभी भी English और हिन्दी के बीच बदल सकते हैं। आपके उत्तर, वर्तमान प्रश्न और टाइमर नहीं बदलते।</>,
    ],
    scheme: 'अंकन योजना — आपका स्कोर कैसे बनता है',
    formula: (t) => (t.negativeMarking > 0
      ? <>स्कोर = (सही × {fmtNum(t.marksPerQuestion)}) − (गलत × {fmtNum(t.negativeMarking)})</>
      : <>स्कोर = सही उत्तर × {fmtNum(t.marksPerQuestion)}  (गलत उत्तर पर कोई अंक नहीं कटता)</>),
    ex: (e, t) => (
      <>
        <b>उदाहरण:</b> {e.n} प्रश्नों में से आप {e.attempted} का उत्तर देते हैं: {e.correct} सही, {e.wrong} गलत और {e.skipped} छोड़ दिए।
        <br />{t.negativeMarking > 0
          ? <>स्कोर = ({e.correct} × {fmtNum(t.marksPerQuestion)}) − ({e.wrong} × {fmtNum(t.negativeMarking)}) = <b>{fmtNum(e.score)}</b> (कुल {fmtNum(t.totalMarks)} में से)।</>
          : <>स्कोर = {e.correct} × {fmtNum(t.marksPerQuestion)} = <b>{fmtNum(e.score)}</b> (कुल {fmtNum(t.totalMarks)} में से) — {e.wrong} गलत उत्तरों पर कोई अंक नहीं कटा।</>}
      </>
    ),
    tip: (t) => (t.negativeMarking > 0 ? 'सुझाव: गलत उत्तर पर अंक कटते हैं, इसलिए केवल अनुमान से उत्तर न दें।' : 'इस टेस्ट में नकारात्मक अंकन नहीं है, इसलिए हर प्रश्न का उत्तर दें।'),
    extra: 'इस टेस्ट के विशेष निर्देश',
    after: 'टेस्ट के बाद आपको अपना स्कोर, रैंक और हर प्रश्न की हिंदी व अंग्रेज़ी में व्याख्या के साथ समीक्षा दिखेगी।',
    declare: 'मैंने सभी निर्देश पढ़ और समझ लिए हैं। मैं इनका पालन करूँगा/करूँगी, अंकन योजना को समझता/समझती हूँ और टेस्ट के दौरान किसी अनुचित साधन का उपयोग नहीं करूँगा/करूँगी।',
    proceed: 'आगे बढ़ें — मैं शुरू करने के लिए तैयार हूँ',
    resume: 'इस टेस्ट का आपका पिछला प्रयास अभी चल रहा है। शेष समय के साथ जारी रखने के लिए उसे फिर से शुरू करें।',
    resumeBtn: 'टेस्ट जारी रखें',
    starting: 'शुरू हो रहा है…',
    previous: 'पिछले प्रयास',
  },
};

const SYMBOLS = ['not-visited', 'not-answered', 'answered', 'marked', 'answered-marked'];

export default function TestDetails() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { lang: siteLang, setLang, t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = () => {
    setError('');
    api(`/tests/${testId}`).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [testId]);

  if (error && !data) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loader label={t.loading} />;
  const { test, inProgressAttemptId, submittedAttempts } = data;

  // The candidate's own language is selected automatically; single-language tests force theirs
  const lang = test.language === 'EN' ? 'en' : test.language === 'HI' ? 'hi' : siteLang;
  const x = TXT[lang];
  const custom = (lang === 'hi' ? test.instructions?.hi : test.instructions?.en) || '';
  const ex = example(test);
  const noQuestions = test.totalQuestions === 0;
  const g = x.g(test);

  const start = async () => {
    setStarting(true);
    setError('');
    try {
      const d = await api('/attempts/start', { method: 'POST', body: { testId } });
      localStorage.setItem('examLang', lang);
      localStorage.setItem(`lang:${d.attempt.id}`, lang);
      navigate(`/exam/${d.attempt.id}`);
    } catch (e) {
      setError(e.message);
      setStarting(false);
    }
  };

  return (
    <div className="nta-page" lang={lang}>
      <div className="nta-logos">
        <Logo className="nta-logo" />
        <div>
          <strong>GS Net Academy</strong>
          <span>{test.exam || 'Online Test'} · {test.subject}</span>
        </div>
      </div>

      <div className="nta-banner">
        <h1>{x.banner}</h1>
        <label className="nta-lang">
          <span>{x.chooseLang}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={test.language !== 'BILINGUAL'}>
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        </label>
      </div>

      <div className="nta-body">
        <h2 className="nta-center">{x.subtitle}</h2>
        <p className="nta-testname"><b>{test.title}</b></p>

        <div className="table-wrap">
          <table className="table glance-table">
            <caption>{x.glance}</caption>
            <tbody>
              <tr><th>{x.rows.questions}</th><td>{test.totalQuestions}</td><th>{x.rows.duration}</th><td>{test.duration} {lang === 'hi' ? 'मिनट' : 'min'}</td></tr>
              <tr><th>{x.rows.marks}</th><td>{fmtNum(test.totalMarks)}</td><th>{x.rows.language}</th><td>{t.tlang[test.language]}</td></tr>
              <tr>
                <th>{x.rows.right}</th><td className="txt-success"><b>+{fmtNum(test.marksPerQuestion)}</b></td>
                <th>{x.rows.wrong}</th><td className="txt-danger"><b>{test.negativeMarking ? `−${fmtNum(test.negativeMarking)}` : '0'}</b></td>
              </tr>
              <tr><th>{x.rows.blank}</th><td>0</td><th /><td /></tr>
            </tbody>
          </table>
        </div>

        <h3 className="nta-u">{x.general}:</h3>
        <ol className="nta-ol">
          {g.map((li, i) => <li key={i}>{li}</li>)}
          <li>
            {x.paletteIntro}
            <ol className="nta-symbols">
              {SYMBOLS.map((sym, i) => (
                <li key={sym}>
                  <span className={`pal pal-${sym}`}>{i + 1}</span>
                  <span>{x.sym[sym]}</span>
                </li>
              ))}
            </ol>
            <p className="note">{x.reviewNote}</p>
          </li>
        </ol>

        <h3 className="nta-u">{x.nav}:</h3>
        <ol className="nta-ol" start={g.length + 2}>{x.n.map((li, i) => <li key={i}>{li}</li>)}</ol>

        <h3 className="nta-u">{x.ans}:</h3>
        <ol className="nta-ol" start={g.length + 2 + x.n.length}>{x.a.map((li, i) => <li key={i}>{li}</li>)}</ol>

        <h3 className="nta-u">{x.scheme}:</h3>
        <div className="scheme-box">
          <p className="formula">{x.formula(test)}</p>
          {!noQuestions && <p>{x.ex(ex, test)}</p>}
          <p className="muted small">{x.tip(test)}</p>
        </div>

        {custom && (
          <>
            <h3 className="nta-u">{x.extra}:</h3>
            <p className="custom-instructions">{custom}</p>
          </>
        )}

        <p className="muted small">{x.after}</p>
        {submittedAttempts > 0 && <p className="muted small">{x.previous}: {submittedAttempts}</p>}

        <hr />
        <p className="nta-red">{x.langNote}</p>
        <hr />

        <ErrorBox message={error} />

        {inProgressAttemptId ? (
          <div className="nta-actions">
            <span>{x.resume}</span>
            <Link className="btn nta-green" to={`/exam/${inProgressAttemptId}`}>{x.resumeBtn}</Link>
          </div>
        ) : (
          <>
            <label className="check nta-declare">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>{x.declare}</span>
            </label>
            <div className="nta-actions">
              <Link className="btn nta-white" to="/">« {x.back}</Link>
              <button className="btn btn-primary proceed-btn" disabled={!agreed || starting || noQuestions} onClick={start}>
                {starting ? x.starting : `${x.proceed} »`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
