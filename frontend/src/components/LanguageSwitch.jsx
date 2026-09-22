export default function LanguageSwitch({ value, onChange, disabled, compact }) {
  return (
    <div className={`lang-switch ${compact ? 'lang-compact' : ''}`} role="group" aria-label="Question language">
      <button type="button" className={value === 'en' ? 'active' : ''} onClick={() => onChange('en')} disabled={disabled} aria-pressed={value === 'en'}>
        English
      </button>
      <button type="button" className={value === 'hi' ? 'active' : ''} onClick={() => onChange('hi')} disabled={disabled} aria-pressed={value === 'hi'} lang="hi">
        हिन्दी
      </button>
    </div>
  );
}
