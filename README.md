# GS Net Academy — Online Test Portal (UGC NET/JRF)

NTA-style bilingual (हिन्दी + English) online test portal: registration, NTA-like instructions,
CBT exam screen, instant result, rank, leaderboard and a question-by-question review with an
explanation for every option. Built with React + Node/Express + MongoDB, packaged with Docker Compose.

## 1. Go live with Docker (recommended)

You need a Linux server (VPS) or any computer with **Docker** and **Docker Compose**.

```bash
# 1) copy the project to the server and open the folder
cd exam-portal

# 2) create your settings file and edit it
cp .env.example .env
nano .env        # set JWT_SECRET (openssl rand -hex 32), ADMIN_PASSWORD, PUBLIC_URL

# 3) start everything (database + backend + website)
docker compose up -d --build

# 4) open the website
#    http://<server-ip>        (or http://localhost on your own computer)
```

On the first start the server automatically:
- creates the admin account from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`;
- loads the **4 bundled UGC NET/JRF tests** (see section 3). If a test with the same title already
  exists it is left untouched, so restarts never duplicate or overwrite your edits.

Useful commands:

| What | Command |
|---|---|
| See logs | `docker compose logs -f backend` |
| Stop | `docker compose down` (data is kept in the `mongo_data` volume) |
| Update after changing code | `docker compose up -d --build` |
| Backup database | `docker compose exec mongo mongodump --archive --db exam_portal > backup.archive` |
| Restore database | `docker compose exec -T mongo mongorestore --archive < backup.archive` |

### Domain and HTTPS
Point your domain (e.g. `test.gsnetacademy.com`) to the server IP. Put HTTPS in front of the
`frontend` container with any reverse proxy (Caddy, Nginx + Certbot, or Cloudflare). After HTTPS works,
set `COOKIE_SECURE=true` and `PUBLIC_URL=https://your-domain` in `.env`, then run
`docker compose up -d`. Keep `COOKIE_SECURE=false` while the site is on plain `http://`, otherwise
browsers will not keep people logged in.

### Logo
The frontend image downloads the logo from `https://gsnetacademy.com/assets/gs-net-academy.png`
while building. If that download is not possible, the browser loads it straight from the website,
and as a last resort a small "GS" badge is shown.

## 2. Run without Docker (development)

```bash
# backend (needs MongoDB 6+ running)
cd backend && cp .env.example .env && npm install
npm run check        # offline self-checks (scoring, validation, all 90 bundled questions)
npm run dev          # http://localhost:5000 — creates admin + loads the 4 tests

# frontend (second terminal)
cd frontend && npm install && npm run dev     # http://localhost:5173
```

## 3. Bundled tests (UGC NET/JRF Paper 1 pattern)

| Test | Questions | Time | Source |
|---|---|---|---|
| Indian National Movement (1857–1950) | 20 | 24 min | GS Net Academy PDF |
| Salient Features of Indian Culture | 20 | 24 min | GS Net Academy PDF |
| Teaching Aptitude Set 1 (Levels, Learner & Methods) | 25 | 30 min | PYQ pattern |
| Teaching Aptitude Set 2 (Evaluation, ICT & Higher Education) | 25 | 30 min | PYQ pattern |

UGC NET rules are applied: **2 marks per question, no negative marking**, and time at the NET rate
of **1.2 minutes per question** (150 questions in 3 hours). Every question is in Hindi and English,
with the correct answer, a main explanation and a reason for every wrong option.
Question files live in `backend/src/data/` — add a new file there (same format) and list it in
`backend/src/data/index.js`, or use the admin panel's JSON import.

## 4. Language (हिन्दी / English)

- The login and register pages have a big **हिन्दी / English** chooser at the top. Labels, placeholders,
  hints and error messages (including server errors such as "mobile already registered") follow it.
- The language chosen at registration is saved on the account. After login the whole site,
  the NTA instructions page and the exam open in that language automatically.
- It can be changed any time from the navbar, the "Choose Your Default Language" box on the
  instructions page, or the switch on the exam screen (the answer, question and timer never change).

## 5. For first-time users

- Login/Register pages show the mentor photo and a numbered, simple guide.
- **मदद / गाइड** (`/help`) is a public page explaining, step by step, how to register, log in, start a
  test, what each button does and what each palette colour means, with GS Net Academy contact numbers.
- Buttons and inputs are large and every field has an example placeholder.

## 6. Registration and login

Full name, email, 10-digit mobile, username, password and confirm password are all **mandatory**
(checked in the browser and again on the server). One account per username, email and mobile.
Login works with **username, email or mobile number**.

## 7. Exam flow

NTA-style instructions (test at a glance, palette symbols, navigation, answering, marking scheme with a
worked example, declaration checkbox) → CBT screen (candidate bar, remaining time, Save & Next /
Save & Mark for Review / Clear Response / Mark for Review & Next, Back / Next / Submit, colour palette)
→ result → review → leaderboard. The timer runs on the server clock, answers autosave, and a server
sweeper auto-submits expired attempts.

## 8. JSON import format

Admin → Tests → open a test → **Import JSON**. Flow: paste/upload → Validate → Preview → Import.
Import is all-or-nothing: if any question is invalid nothing is saved and errors are listed
("Question 7: Hindi option B is missing."). Max 500 questions per import.

```json
{
  "questions": [
    {
      "question": { "en": "2 + 2 = ?", "hi": "2 + 2 = ?" },
      "options": { "en": ["2", "3", "4", "5"], "hi": ["2", "3", "4", "5"] },
      "correctAnswer": 2,
      "explanation": {
        "en": { "correct": "2 + 2 equals 4.", "options": { "0": "2 is incorrect.", "1": "3 is incorrect.", "2": "4 is correct.", "3": "5 is incorrect." } },
        "hi": { "correct": "2 + 2 बराबर 4 होता है।", "options": { "0": "2 गलत है।", "1": "3 गलत है।", "2": "4 सही है।", "3": "5 गलत है।" } }
      }
    }
  ]
}
```

`correctAnswer` may be `0–3` or `"A"–"D"`. A bare array (without the `questions` wrapper) is also accepted.
See `backend/sample-questions.json`.

## 9. API

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/register` (name, email, mobile, username, password, confirmPassword — all required) | public (rate-limited) |
| POST | `/api/auth/login` (`identifier` = username / email / mobile, `password`), `/api/auth/logout` | public (rate-limited) |
| GET | `/api/auth/me` | user |
| GET | `/api/tests`, `/api/tests/filters`, `/api/tests/:id` | user |
| POST / PUT / DELETE | `/api/tests`, `/api/tests/:id` | admin |
| POST | `/api/tests/:id/status` (publish / unpublish / archive) | admin |
| PUT | `/api/tests/:id/reorder` | admin |
| GET | `/api/questions/test/:testId` | admin |
| POST / PUT / DELETE | `/api/questions`, `/api/questions/:id` | admin |
| POST | `/api/questions/import` (`dryRun: true` to validate only) | admin |
| POST | `/api/attempts/start` | user |
| GET | `/api/attempts/my`, `/api/attempts/:id` | owner / admin |
| POST | `/api/attempts/:id/answer`, `/api/attempts/:id/submit` | owner |
| GET | `/api/attempts/:id/review` (only after submit) | owner / admin |
| GET | `/api/leaderboard/test/:testId` | user |
| GET | `/api/admin/dashboard`, `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/attempts`, `/api/admin/tests` | admin |
| PATCH | `/api/admin/users/:id/status` | admin |

Errors always look like `{ "success": false, "message": "Test not found" }`.

## 10. Security notes

bcrypt password hashing · httpOnly SameSite cookie JWT · role middleware on every admin route ·
blocked users are rejected · helmet headers · CORS allow-list · 2 MB body limit · auth rate limit ·
ObjectId validation · escaped search regex · centralized error handler (no stack traces in production) ·
`passwordHash` never selected by default · correct answers hidden during attempts.


## 11. What was tested

- `npm run check`: scoring, ranking tie-breaks, validation, and all 90 bundled questions
  (4 options each, no duplicates, English + Hindi explanation for every option, NET timing/marks).
- Full API run against a MongoDB-compatible server (FerretDB): server start → admin + 4 tests seeded →
  registration (missing fields, duplicate email/mobile), login by username/email/mobile, language save,
  exam start (answers not leaked), autosave, submit (twice), score 24/40 for 12 right / 3 wrong / 5 skipped,
  review, answer after submit rejected.
- Browser run of login, register (Hindi and English errors), dashboard, NTA instructions and exam screen.
- Not tested here: `docker compose` itself (Docker is not available in the build environment), and the
  result/leaderboard ranking query on real MongoDB (FerretDB lacks `$first`; the ranking logic is covered
  by the self-checks). Please run `docker compose up -d --build` once and try one full test.
