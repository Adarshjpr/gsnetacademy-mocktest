export const LABELS = ['A', 'B', 'C', 'D'];

const pad = (n) => String(n).padStart(2, '0');

/** 3725 -> "01:02:05", 125 -> "02:05" */
export function fmtClock(secs) {
  const s = Math.max(0, Math.floor(secs || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** 2902 -> "48m 22s" */
export function fmtDuration(secs) {
  if (secs == null) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

export function fmtDate(d, withTime = true) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(d) {
  if (!d) return 'Never';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 172800) return 'Yesterday';
  if (s < 30 * 86400) return `${Math.floor(s / 86400)} days ago`;
  return fmtDate(d, false);
}

export function fmtNum(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number.isInteger(n) ? String(n) : Number(n).toFixed(2).replace(/\.?0+$/, '');
}

/** Bilingual field with fallback to the other language when one is empty */
export function pick(obj, lang) {
  if (!obj) return '';
  const v = obj[lang];
  const empty = v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.some((x) => x && String(x).trim()));
  if (!empty) return v;
  return obj[lang === 'en' ? 'hi' : 'en'] ?? '';
}

export const CATEGORY_LABEL = { MOCK: 'Mock test', PYQ: 'Previous year', PRACTICE: 'Practice' };
export const DIFFICULTY_LABEL = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };
export const LANGUAGE_LABEL = { BILINGUAL: 'Hindi + English', EN: 'English', HI: 'Hindi' };
