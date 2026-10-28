import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext.jsx';
import { Brand } from './Layout.jsx';

/** Big हिन्दी / English chooser used at the top of the login and register forms */
export function BigLangChoice() {
  const { lang, setLang } = useLang();
  return (
    <div className="big-lang" role="group" aria-label="भाषा चुनें / Choose language">
      <span className="big-lang-label">भाषा चुनें / Choose language</span>
      <div className="big-lang-buttons">
        <button type="button" lang="hi" className={lang === 'hi' ? 'active' : ''} aria-pressed={lang === 'hi'} onClick={() => setLang('hi')}>
          हिन्दी
        </button>
        <button type="button" className={lang === 'en' ? 'active' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
          English
        </button>
      </div>
    </div>
  );
}

/** Layout for login/register: mentor photo + written guide + the form */
export default function AuthShell({ mode, children }) {
  const { t } = useLang();
  const steps = mode === 'register' ? t.guide.register : t.guide.login;
  return (
    <div className="auth-shell">
      <header className="auth-top">
        <Brand />
        <Link to="/help" className="btn btn-small auth-help">{t.nav.help}</Link>
      </header>

      <div className="auth-grid">
        <figure className="auth-photo">
          <img src="/founder.png" alt="Dr. Shardool Sir (Vijay Kr. Gupta) — Founder & MD, GS Net Academy" />
          <figcaption>
            <b>Dr. Shardool Sir</b> (Vijay Kr. Gupta) · {t.guide.mentor}, GS Net Academy
          </figcaption>
        </figure>

        <main className="auth-main">{children}</main>

        <section className="guide-box" aria-labelledby="guide-title">
          <h2 id="guide-title">{t.guide.title}</h2>
          <ol className="guide-steps">
            {steps.map((s, i) => (
              <li key={i}><span className="step-no">{i + 1}</span><span>{s}</span></li>
            ))}
          </ol>
          <Link to="/help" className="guide-more">{t.guide.more} →</Link>
        </section>
      </div>

      <footer className="auth-foot">
        <a href="https://gsnetacademy.com" target="_blank" rel="noreferrer">www.gsnetacademy.com</a>
        <span>📞 <a href="tel:+919810845327">9810845327</a> · <a href="tel:+919266511505">9266511505</a></span>
      </footer>
    </div>
  );
}
