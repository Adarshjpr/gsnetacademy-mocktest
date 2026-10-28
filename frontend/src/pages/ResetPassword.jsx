import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell, { BigLangChoice } from '../components/AuthShell.jsx';
import { api } from '../api.js';
import { useLang } from '../context/LangContext.jsx';
import { serverMsg } from '../utils/ui.js';

export default function ResetPassword() {
  const { t, lang } = useLang();
  const a = t.auth;
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(!token ? a.resetInvalid : '');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      setError(t.err.passwordShort);
      return;
    }
    if (password.length > 100) {
      setError(a.passwordTooLong);
      return;
    }
    if (password !== confirmPassword) {
      setError(a.resetMismatch);
      return;
    }

    setError('');
    setBusy(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setSuccess(true);
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
        <h1>{a.resetTitle}</h1>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{a.resetSuccess}</div>}
        {!success && token && (
          <>
            <label className="field">
              <span>{a.newPassword}</span>
              <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
            </label>
            <label className="field">
              <span>{a.confirmNewPassword}</span>
              <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </label>
            <button className="btn btn-primary btn-block btn-big" disabled={busy}>
              {busy ? a.resetting : a.resetBtn}
            </button>
          </>
        )}
        {error && !success && <Link className="btn btn-block btn-outline-big" to="/forgot-password">{a.sendResetLink}</Link>}
        <Link className="btn btn-block btn-outline-big" to="/login">{a.backToLogin}</Link>
      </form>
    </AuthShell>
  );
}
