import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import LanguageSwitch from './LanguageSwitch.jsx';

// The logo is copied into the build from gsnetacademy.com (see frontend/Dockerfile).
// If the local copy is missing we load it from the website, and as a last resort show "GS".
const LOGO_SOURCES = ['/gs-net-academy.png', 'https://gsnetacademy.com/assets/gs-net-academy.png'];

export function Logo({ className = '' }) {
  const [i, setI] = useState(0);
  if (i >= LOGO_SOURCES.length) {
    return <span className={`brand-mark ${className}`} aria-hidden="true">GS</span>;
  }
  return <img className={`brand-logo ${className}`} src={LOGO_SOURCES[i]} alt="GS Net Academy" onError={() => setI(i + 1)} />;
}

export function Brand() {
  const { t } = useLang();
  return (
    <span className="brand">
      <Logo />
      <span className="brand-text">
        <span className="brand-name">GS Net Academy</span>
        <span className="brand-sub">{t.brandSub}</span>
      </span>
    </span>
  );
}

/** हिन्दी / English switch for the whole site */
export function SiteLangSwitch() {
  const { lang, setLang, t } = useLang();
  return (
    <span className="site-lang" title={t.langLabel}>
      <LanguageSwitch value={lang} onChange={setLang} compact />
    </span>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const doLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand-link" aria-label="Home">
          <Brand />
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/" end>
            {t.nav.tests}
          </NavLink>
          <NavLink to="/my-tests">{t.nav.myTests}</NavLink>
          <NavLink to="/help">{t.nav.help}</NavLink>
          {user?.role === 'ADMIN' && <NavLink to="/admin">{t.nav.admin}</NavLink>}
        </nav>
        <div className="nav-user">
          <SiteLangSwitch />
          <span className="avatar" aria-hidden="true">
            {(user?.name || user?.username || '?')[0].toUpperCase()}
          </span>
          <span className="nav-username" title={`@${user?.username}`}>{user?.name || user?.username}</span>
          <button className="btn btn-ghost btn-small" onClick={doLogout}>
            {t.nav.logout}
          </button>
        </div>
      </div>
    </header>
  );
}

export function MainLayout() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}

export function AdminLayout() {
  return (
    <>
      <Navbar />
      <div className="admin-shell">
        <aside className="admin-side">
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
          <NavLink to="/admin/tests">Tests & questions</NavLink>
          <NavLink to="/admin/attempts">Attempts</NavLink>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
