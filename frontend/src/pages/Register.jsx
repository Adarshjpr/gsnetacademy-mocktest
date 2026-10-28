import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import AuthShell, { BigLangChoice } from '../components/AuthShell.jsx';
import { serverMsg } from '../utils/ui.js';

const EMPTY = { name: '', email: '', mobile: '', username: '', password: '', confirmPassword: '' };

/** Same rules as the server (backend/src/utils/validators.js). Returns error keys. */
function validate(f) {
  const e = {};
  const name = f.name.trim();
  if (!name) e.name = 'nameRequired';
  else if (name.length < 2) e.name = 'nameShort';
  else if (!/^[\p{L}\p{M} .'-]+$/u.test(name)) e.name = 'nameChars';

  if (!f.email.trim()) e.email = 'emailRequired';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'emailInvalid';

  const digits = f.mobile.replace(/[\s\-()]/g, '').replace(/^(\+91|91(?=\d{10}$)|0(?=\d{10}$))/, '');
  if (!f.mobile.trim()) e.mobile = 'mobileRequired';
  else if (!/^[6-9]\d{9}$/.test(digits)) e.mobile = 'mobileInvalid';

  if (!f.username.trim()) e.username = 'usernameRequired';
  else if (!/^[a-zA-Z0-9_.]{3,30}$/.test(f.username.trim())) e.username = 'usernameInvalid';

  if (f.password.length < 6) e.password = 'passwordShort';
  if (!f.confirmPassword) e.confirmPassword = 'confirmRequired';
  else if (f.password !== f.confirmPassword) e.confirmPassword = 'mismatch';
  return e;
}

export default function Register() {
  const { register } = useAuth();
  const { t, lang } = useLang();
  const a = t.auth;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const errors = validate(form);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const blur = (k) => () => setTouched((prev) => ({ ...prev, [k]: true }));
  const show = (k) => touched[k] && errors[k];

  const submit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    if (Object.keys(errors).length) return;
    setServerErrors([]);
    setBusy(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim(), username: form.username.trim(), language: lang });
      navigate('/', { replace: true });
    } catch (err) {
      setServerErrors(err.data?.details || [err.message]);
    } finally {
      setBusy(false);
    }
  };

  // Called as a function (not <Field/>) so inputs keep focus between renders
  const field = ({ k, label, placeholder, hint, ...props }) => (
    <label className={`field ${show(k) ? 'has-error' : ''}`}>
      <span>{label} <b className="req" title={a.mandatory}>*</b></span>
      <input value={form[k]} onChange={set(k)} onBlur={blur(k)} placeholder={placeholder} required aria-invalid={!!show(k)} {...props} />
      {show(k) ? <small className="field-error">⚠ {t.err[errors[k]]}</small> : hint && <small className="field-hint">{hint}</small>}
    </label>
  );

  return (
    <AuthShell mode="register">
      <form className="auth-card" onSubmit={submit} noValidate>
        <BigLangChoice />
        <p className="field-hint">{a.testLangHint}</p>
        <h1>{a.registerTitle}</h1>
        <p className="muted small">{a.registerSub}</p>
        {serverErrors.length > 0 && (
          <div className="alert alert-error" role="alert">
            <ul>{serverErrors.map((m) => <li key={m}>{serverMsg(m, lang)}</li>)}</ul>
          </div>
        )}
        {field({ k: 'name', label: a.name, placeholder: a.namePh, autoComplete: 'name', autoFocus: true })}
        <div className="field-row">
          {field({ k: 'email', label: a.email, placeholder: a.emailPh, type: 'email', autoComplete: 'email', inputMode: 'email' })}
          {field({ k: 'mobile', label: a.mobile, placeholder: a.mobilePh, type: 'tel', inputMode: 'numeric', autoComplete: 'tel', maxLength: 15 })}
        </div>
        {field({ k: 'username', label: a.username, placeholder: a.usernamePh, hint: a.usernameHint, autoComplete: 'username', autoCapitalize: 'none' })}
        <div className="field-row">
          {field({ k: 'password', label: a.pass, placeholder: a.passPh, type: 'password', autoComplete: 'new-password' })}
          {field({ k: 'confirmPassword', label: a.confirm, placeholder: a.confirmPh, type: 'password', autoComplete: 'new-password' })}
        </div>
        {/* preventDefault on mousedown keeps focus in the field, so a blur-error appearing
            above the button cannot shift it away before the click lands */}
        <button className="btn btn-primary btn-block btn-big" disabled={busy} onMouseDown={(e) => e.preventDefault()}>
          {busy ? a.registering : a.registerBtn}
        </button>
        <div className="auth-switch">
          <span>{a.already}</span>
          <Link className="btn btn-block btn-outline-big" to="/login">{a.goLogin}</Link>
        </div>
      </form>
    </AuthShell>
  );
}
