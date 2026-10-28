import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { Brand, SiteLangSwitch } from '../components/Layout.jsx';

/** Simple step-by-step guide for first-time users (works without login) */
const G = {
  hi: {
    title: 'वेबसाइट इस्तेमाल करने की पूरी गाइड',
    lead: 'यह वेबसाइट GS Net Academy की है। यहाँ आप UGC NET/JRF जैसी असली ऑनलाइन परीक्षा का अभ्यास कर सकते हैं। नीचे दिए कदम एक-एक करके पढ़ें।',
    back: '← वापस जाएँ',
    sections: [
      { h: '1. नया अकाउंट बनाना (रजिस्टर)', steps: [
        'लॉगिन पेज पर "नया अकाउंट बनाएँ" बटन दबाएँ।',
        'सबसे ऊपर भाषा चुनें — हिन्दी या English। गलती के संदेश भी इसी भाषा में आएँगे।',
        'अपना पूरा नाम लिखें, जैसे: रवि कुमार।',
        'अपना ईमेल लिखें, जैसे: ravi@gmail.com।',
        'अपना 10 अंकों का मोबाइल नंबर लिखें, जैसे: 9876543210।',
        'यूज़रनेम बनाएँ — अंग्रेज़ी अक्षरों में, बिना स्पेस के, जैसे: ravi_k।',
        'पासवर्ड बनाएँ (कम से कम 6 अक्षर) और उसे दोबारा लिखें। पासवर्ड कहीं लिखकर रख लें।',
        '"रजिस्टर करें" दबाएँ। अकाउंट बनते ही आप अंदर पहुँच जाएँगे।',
      ] },
      { h: '2. लॉगिन करना', steps: [
        'यूज़रनेम, ईमेल या मोबाइल नंबर — इनमें से कोई एक लिखें।',
        'पासवर्ड लिखें। देखने के लिए "पासवर्ड दिखाएँ" पर टिक कर सकते हैं।',
        '"लॉगिन करें" दबाएँ।',
      ] },
      { h: '3. टेस्ट शुरू करना', steps: [
        'टेस्ट सूची में से कोई टेस्ट चुनें और "टेस्ट शुरू करें" दबाएँ।',
        'निर्देश पेज खुलेगा। इसमें लिखा होगा कि कितने प्रश्न हैं, कितना समय है और अंक कैसे मिलेंगे।',
        'ऊपर "अपनी डिफ़ॉल्ट भाषा चुनें" से हिन्दी या English चुनें।',
        'नीचे बॉक्स पर टिक करें और "मैं शुरू करने के लिए तैयार हूँ" दबाएँ। टाइमर शुरू हो जाएगा।',
      ] },
      { h: '4. प्रश्न का उत्तर देना', steps: [
        'प्रश्न पढ़ें और सही विकल्प के आगे बने गोले पर क्लिक करें। उत्तर तुरंत सेव हो जाता है।',
        'उत्तर बदलना हो तो दूसरे विकल्प पर क्लिक करें। हटाना हो तो "उत्तर हटाएँ" दबाएँ।',
        'ऊपर हिन्दी / English बटन से कभी भी भाषा बदल सकते हैं — आपका उत्तर और समय नहीं बदलता।',
        'मोबाइल पर "प्रश्न सूची" बटन दबाकर सभी प्रश्नों के नंबर देख सकते हैं।',
      ] },
    ],
    buttonsTitle: '5. नीचे के बटन क्या करते हैं?',
    buttons: [
      ['nta-green', 'सेव करें और आगे बढ़ें', 'उत्तर सेव करके अगले प्रश्न पर जाता है।'],
      ['nta-orange', 'सेव करें और समीक्षा हेतु चिह्नित करें', 'उत्तर रखता है और प्रश्न को बाद में दोबारा देखने के लिए चिह्नित करता है।'],
      ['nta-white', 'उत्तर हटाएँ', 'चुना हुआ उत्तर हटा देता है।'],
      ['nta-blue', 'समीक्षा हेतु चिह्नित करें और आगे बढ़ें', 'प्रश्न को चिह्नित करके अगले प्रश्न पर जाता है।'],
      ['nta-green', 'सबमिट', 'पूरा टेस्ट जमा करता है। उसके बाद उत्तर नहीं बदल सकते।'],
    ],
    colorsTitle: '6. प्रश्न नंबरों के रंगों का मतलब',
    colors: [
      ['not-visited', 'स्लेटी — प्रश्न अभी तक नहीं देखा।'],
      ['not-answered', 'लाल — प्रश्न देखा पर उत्तर नहीं दिया।'],
      ['answered', 'हरा — उत्तर दे दिया।'],
      ['marked', 'बैंगनी — उत्तर नहीं दिया, बाद में देखने के लिए चिह्नित।'],
      ['answered-marked', 'बैंगनी + हरा बिंदु — उत्तर दिया और चिह्नित किया। इसके अंक गिने जाएँगे।'],
    ],
    endTitle: '7. समय, सबमिट और परिणाम',
    end: [
      'ऊपर दाईं ओर नारंगी बॉक्स में बचा हुआ समय दिखता है। 5 मिनट बचने पर यह लाल हो जाता है।',
      'समय खत्म होते ही टेस्ट अपने-आप सबमिट हो जाता है।',
      'परिणाम में आपके अंक, रैंक, सही/गलत प्रश्न दिखेंगे।',
      '"उत्तर और व्याख्या देखें" दबाकर हर प्रश्न का सही उत्तर और हर विकल्प की व्याख्या हिंदी व अंग्रेज़ी में पढ़ें।',
    ],
    troubleTitle: '8. कोई समस्या आए तो',
    trouble: [
      'इंटरनेट बंद हो जाए या फ़ोन बंद हो जाए तो घबराएँ नहीं — आपके उत्तर सेव रहते हैं। दोबारा खोलें और "टेस्ट जारी रखें" दबाएँ।',
      'ध्यान रखें: टेस्ट का समय रुकता नहीं है, इसलिए जल्दी वापस आएँ।',
      'पासवर्ड भूल गए हों या कोई और परेशानी हो तो GS Net Academy से संपर्क करें:',
    ],
    start: 'अभी शुरू करें',
  },
  en: {
    title: 'Complete guide to using this website',
    lead: 'This website belongs to GS Net Academy. Here you can practise real online exams like UGC NET/JRF. Read the steps below one by one.',
    back: '← Go back',
    sections: [
      { h: '1. Creating an account (Register)', steps: [
        'On the login page, tap "Create a new account".',
        'At the top, choose the language — हिन्दी or English. Error messages also appear in this language.',
        'Write your full name, e.g. Ravi Kumar.',
        'Write your email, e.g. ravi@gmail.com.',
        'Write your 10-digit mobile number, e.g. 9876543210.',
        'Make a username in English letters without spaces, e.g. ravi_k.',
        'Make a password (at least 6 characters) and type it again. Note the password down somewhere safe.',
        'Tap "Register". You are logged in as soon as the account is made.',
      ] },
      { h: '2. Logging in', steps: [
        'Type any one of: username, email or mobile number.',
        'Type your password. Tick "Show password" to see what you typed.',
        'Tap "Log in".',
      ] },
      { h: '3. Starting a test', steps: [
        'Choose a test from the list and tap "Start test".',
        'The instructions page opens. It shows how many questions there are, the time and how marks are given.',
        'Choose हिन्दी or English under "Choose your default language".',
        'Tick the box at the bottom and tap "I am ready to begin". The timer starts.',
      ] },
      { h: '4. Answering a question', steps: [
        'Read the question and tap the circle in front of the correct option. Your answer is saved immediately.',
        'To change the answer tap another option. To remove it tap "Clear Response".',
        'Use the English / हिन्दी buttons at the top to change language at any time — your answer and time do not change.',
        'On a phone, tap the "Questions" button to see all question numbers.',
      ] },
    ],
    buttonsTitle: '5. What do the buttons at the bottom do?',
    buttons: [
      ['nta-green', 'Save & Next', 'Saves the answer and goes to the next question.'],
      ['nta-orange', 'Save & Mark for Review', 'Keeps the answer and marks the question to check again later.'],
      ['nta-white', 'Clear Response', 'Removes the selected answer.'],
      ['nta-blue', 'Mark for Review & Next', 'Marks the question and goes to the next one.'],
      ['nta-green', 'Submit', 'Submits the whole test. Answers cannot be changed after this.'],
    ],
    colorsTitle: '6. What the colours of question numbers mean',
    colors: [
      ['not-visited', 'Grey — you have not seen the question yet.'],
      ['not-answered', 'Red — seen but not answered.'],
      ['answered', 'Green — answered.'],
      ['marked', 'Purple — not answered, marked to check later.'],
      ['answered-marked', 'Purple with green dot — answered and marked. This answer WILL be counted.'],
    ],
    endTitle: '7. Time, submit and result',
    end: [
      'The orange box at the top right shows the time left. It turns red when 5 minutes are left.',
      'When time is over, the test is submitted automatically.',
      'The result shows your marks, rank and correct/wrong questions.',
      'Tap "Review answers & explanations" to read the correct answer and an explanation for every option in Hindi and English.',
    ],
    troubleTitle: '8. If something goes wrong',
    trouble: [
      'If the internet or phone switches off, do not worry — your answers are saved. Open the site again and tap "Resume test".',
      'Remember: the test timer does not stop, so come back quickly.',
      'If you forgot your password or face any other problem, contact GS Net Academy:',
    ],
    start: 'Start now',
  },
};

export default function Help() {
  const { user } = useAuth();
  const { lang } = useLang();
  const g = G[lang];
  return (
    <div className="help-page" lang={lang}>
      <header className="auth-top">
        <Link to={user ? '/' : '/login'} className="brand-link"><Brand /></Link>
        <SiteLangSwitch />
      </header>
      <main className="help-main">
        <Link to={user ? '/' : '/login'} className="back-link">{g.back}</Link>
        <h1>{g.title}</h1>
        <p className="lead">{g.lead}</p>

        {g.sections.map((s) => (
          <section key={s.h} className="help-card">
            <h2>{s.h}</h2>
            <ol className="guide-steps">
              {s.steps.map((x, i) => <li key={i}><span className="step-no">{i + 1}</span><span>{x}</span></li>)}
            </ol>
          </section>
        ))}

        <section className="help-card">
          <h2>{g.buttonsTitle}</h2>
          <ul className="help-buttons">
            {g.buttons.map(([cls, label, what]) => (
              <li key={label}><span className={`btn ${cls} help-btn`} aria-hidden="true">{label}</span><span>{what}</span></li>
            ))}
          </ul>
        </section>

        <section className="help-card">
          <h2>{g.colorsTitle}</h2>
          <ul className="symbol-list">
            {g.colors.map(([st, text], i) => (
              <li key={st}><span className={`pal pal-${st}`}>{i + 1}</span><span>{text}</span></li>
            ))}
          </ul>
        </section>

        <section className="help-card">
          <h2>{g.endTitle}</h2>
          <ul className="nta-list">{g.end.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>

        <section className="help-card">
          <h2>{g.troubleTitle}</h2>
          <ul className="nta-list">{g.trouble.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="contact-big">
            📞 <a href="tel:+919810845327">9810845327</a> · <a href="tel:+919266511505">9266511505</a> · <a href="https://gsnetacademy.com" target="_blank" rel="noreferrer">gsnetacademy.com</a>
          </p>
        </section>

        <Link className="btn btn-primary btn-big" to={user ? '/' : '/register'}>{g.start} »</Link>
      </main>
    </div>
  );
}
