import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import AuthShell, { BigLangChoice } from '../components/AuthShell.jsx';
import { serverMsg } from '../utils/ui.js';

export default function Login() {
  const { login } = useAuth();
  const { t, lang } = useLang();
  const a = t.auth;
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.identifier.trim() || !form.password) return setError(a.fillBoth);
    setError('');
    setBusy(true);
    try {
      const user = await login(form.identifier.trim(), form.password);
      navigate(location.state?.from || (user.role === 'ADMIN' ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell mode="login">
      <form className="auth-card" onSubmit={submit} noValidate>
        <BigLangChoice />
        <h1>{a.loginTitle}</h1>
        <p className="muted">{a.loginSub}</p>
        {error && <div className="alert alert-error" role="alert">{serverMsg(error, lang)}</div>}
        <label className="field">
          <span>{a.identifier}</span>
          <input autoComplete="username" placeholder={a.identifierPh} value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} autoFocus />
        </label>
        <label className="field">
          <span>{a.password}</span>
          <input type={show ? 'text' : 'password'} autoComplete="current-password" placeholder={a.passwordPh} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <label className="check small">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          <span>{a.showPassword}</span>
        </label>
        <button className="btn btn-primary btn-block btn-big" disabled={busy}>
          {busy ? a.loggingIn : a.loginBtn}
        </button>
        <div className="auth-switch">
          <span>{a.newHere}</span>
          <Link className="btn btn-block btn-outline-big" to="/register">{a.createAccount}</Link>
        </div>
      </form>
    </AuthShell>
  );
}
