import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';
import { UI } from '../utils/ui.js';

const LangContext = createContext(null);

/** Hindi is the default; a browser set to English starts in English. */
function initialLang() {
  try {
    const saved = localStorage.getItem('uiLang');
    if (saved === 'en' || saved === 'hi') return saved;
  } catch { /* storage unavailable */ }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'hi';
}

export function LangProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [lang, setLangState] = useState(initialLang);

  const apply = useCallback((l) => {
    setLangState(l);
    try {
      localStorage.setItem('uiLang', l);
      localStorage.setItem('examLang', l); // default language for instructions and the exam
    } catch { /* ignore */ }
  }, []);

  // After login, use the language the candidate chose at registration
  useEffect(() => {
    if (user?.language === 'en' || user?.language === 'hi') apply(user.language);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /** Change the language everywhere and remember it on the account */
  const setLang = useCallback(
    (l) => {
      apply(l);
      if (user && user.language !== l) {
        api('/auth/me/language', { method: 'PATCH', body: { language: l } })
          .then((d) => updateUser(d.user))
          .catch(() => {});
      }
    },
    [apply, user, updateUser]
  );

  return <LangContext.Provider value={{ lang, setLang, t: UI[lang] }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
