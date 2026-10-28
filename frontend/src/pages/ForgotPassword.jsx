import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell, { BigLangChoice } from '../components/AuthShell.jsx';
import { api } from '../api.js';
import { useLang } from '../context/LangContext.jsx';
import { serverMsg } from '../utils/ui.js';

export default function ForgotPassword() {
  const { t, lang } = useLang();
  const a = t.auth;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setError(t.err.emailRequired);
      return;
    }

    setError('');
    setBusy(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setSent(true);
    } catch (err) {
      setError(serverMsg(err.message, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell mode="login">
      <form className="auth-card" onSubmit={submit} noValidate>
        <BigLangChoice />
        <h1>{a.forgotTitle}</h1>
        <p className="muted">{a.forgotSub}</p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {sent && <div className="alert alert-success" role="status">{a.resetEmailSent}</div>}
        {!sent && (
          <>
            <label className="field">
              <span>{a.email}</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={a.emailPh}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
              />
            </label>
            <button className="btn btn-primary btn-block btn-big" disabled={busy}>
              {busy ? a.sendingResetLink : a.sendResetLink}
            </button>
          </>
        )}
        <Link className="btn btn-block btn-outline-big" to="/login">{a.backToLogin}</Link>
      </form>
    </AuthShell>
  );
}
