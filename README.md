# College Quiz & Anonymous Feedback Portal

A complete, production-quality full-stack college web application built with **React + TypeScript + Tailwind CSS + Recharts** and **Spring Boot 3 + Spring Security + Flyway + MySQL 8.0**.

It provides:
1. **QR-Powered Classroom Quiz Portal** — Instructors publish quizzes and individual MCQ questions, project scannable QR codes, and view strictly aggregate class comprehension analytics. Students submit answers without logging in, duplicate votes are blocked via one-time privacy-preserving tokens, and correct answers + explanations are revealed *only after* server-side submission.
2. **Confidential Anonymous Feedback Portal** — Students share honest feedback about teaching staff, teaching quality, laboratories, classrooms, facilities, academics, or management without login or identity metadata. Only authorized **Administrators** can review, filter, and resolve feedback (**Staff** accounts are strictly denied access).

---

## Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui-styled component primitives, Lucide Icons, Recharts, `qrcode.react`, React Router 6 |
| **Backend** | Spring Boot 3.3 (Java 17, Maven), Spring Web, Spring Data JPA (Hibernate), Spring Security 6, Bean Validation, JJWT, ZXing QR PNG generator |
| **Database** | MySQL 8.0 with **Flyway** versioned SQL migrations (`V1__init_schema.sql`) |
| **Testing & Demo Mode** | JUnit 5 + Spring MockMvc + H2 (`MODE=MySQL`) running the exact same Flyway schema |

---

## Database Schema (MySQL 8.0 / Flyway)

Defined in [`backend/src/main/resources/db/migration/V1__init_schema.sql`](backend/src/main/resources/db/migration/V1__init_schema.sql):

- `roles` (`ADMIN`, `STAFF`)
- `users` (BCrypt password hashes, department, active flag — **strictly decoupled** from anonymous responses & feedback)
- `quizzes` (unique `public_code`, status `DRAFT | PUBLISHED | CLOSED`, optional schedule)
- `questions` (unique `public_code` for per-question QR links, optional `explanation`, `ACTIVE | CLOSED`)
- `options` (`option_label`, `option_text`, `is_correct`)
- `submission_tokens` (one-time SHA-256 peppered token hashes with atomic consumption & TTL — zero PII/IP)
- `anonymous_quiz_responses` (linked only to `quiz_id`, `question_id`, `selected_option_id`, `is_correct`, `token_hash` with unique constraint `(question_id, token_hash)` — **no user_id, name, email, roll number, or IP**)
- `feedback_categories` (seeded with Teaching Staff, Teaching Quality, Academics, Classrooms, Laboratories, College Facilities, Management, Other)
- `feedback` (`category_id`, optional `subject`, `message`, `status`, `admin_notes`, timestamps — **zero foreign key to `users`, zero IP or device metadata**)
- `audit_logs` (tracks administrative actions only)
- `portal_settings` (institution branding, QR base URL, anonymous feedback toggle, rate limit, privacy notice)

---

## Security & Privacy Architecture

- **Pre-Submission Answer Hiding**: Public endpoints (`GET /api/public/quizzes/{code}` and `GET /api/public/questions/{code}`) serialize dedicated `PublicQuestionDto` / `PublicOptionDto` records that structurally omit `correct` and `explanation`. Correct answers and explanations are returned *only* by `POST /api/public/questions/{code}/submit` after server-side validation.
- **Duplicate Submission Prevention**:
  1. Server issues a random 256-bit one-time token (`POST /api/public/tokens/issue`) and stores only its peppered SHA-256 hash.
  2. Submission atomically consumes the token (`UPDATE submission_tokens SET used = true ... WHERE used = false`) and enforces a database unique index on `(question_id, token_hash)`. Replays return `409 Conflict`.
  3. An `HttpOnly`, HMAC-signed, identity-free browser cookie (`cq_submitted`) lists completed question codes so reloading a QR page prevents issuing a second token in the same browser.
- **Aggregate-Only Admin Analytics**: All admin analytics endpoints run `COUNT` / `GROUP BY` SQL queries only. No API returns raw rows from `anonymous_quiz_responses`. All percentages are computed strictly as `(count / totalValidSubmissions) * 100` (returning `0.0%` when `totalValidSubmissions == 0`).
- **Role-Based Access Control (RBAC)**:
  - `ROLE_ADMIN`: Full access to Dashboard, Quizzes, Questions, QR Generator, Aggregate Analytics, Anonymous Feedback Management, Settings, and Audit Logs.
  - `ROLE_STAFF`: Access to Quizzes, Questions, QR Generator, and Aggregate Quiz Analytics. **Strictly blocked (`403 Forbidden`)** from `/api/admin/feedback/**`, `/api/admin/settings/**`, `/api/admin/audit-logs/**`, and feedback metrics in the dashboard overview.
- **Auth, CSRF, XSS, SQLi & Rate Limiting**:
  - BCrypt (cost 12) password hashing + HMAC-SHA256 JWT (via `HttpOnly` cookie and `Authorization: Bearer` header).
  - Double-submit `XSRF-TOKEN` / `X-XSRF-TOKEN` verification for cookie-authenticated mutations.
  - Server-side input validation (`jakarta.validation`) + script/HTML sanitization + parameterized JPA queries + strict HTTP security headers (`CSP`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`).
  - In-memory sliding-window rate limiter using ephemeral per-boot hashed buckets (never logged or persisted).

### Documented Privacy Limitations

> **Important**: While this application never collects student identities, accounts, cookies, or IP addresses in anonymous feedback records (and disables Nginx access logging on `/api/public/feedback` in `frontend/nginx.conf`), **no web application alone can guarantee absolute network-level anonymity** if external infrastructure — such as campus Wi-Fi/NAT gateways, institutional firewalls, TLS-terminating load balancers, or cloud hosting access logs — records client IP addresses and request timestamps. Institutional IT teams should disable IP access logging on public feedback routes and serve the portal exclusively over HTTPS.

---

## Setup & Running Locally

### Prerequisites
- **Java 17** (`java -version`)
- **Apache Maven 3.9+** (`mvn -version`)
- **Node.js 20+** and **npm** (`node -v`)
- **MySQL 8.0** running on `localhost:3306`

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your real MySQL password and strong random secrets (never commit `.env`):

```powershell
Copy-Item .env.example .env
```

Required variables for MySQL production/development mode:
- `DB_URL` — defaults to `jdbc:mysql://localhost:3306/college_quiz_portal?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`
- `DB_USERNAME` — e.g. `root` or a dedicated least-privilege MySQL user
- `DB_PASSWORD` — your MySQL server password
- `JWT_SECRET` — random string of at least 64 characters
- `TOKEN_PEPPER` — random secret string for hashing one-time submission tokens
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — initial Admin credentials (if omitted on first boot, a one-time random password is generated and printed once in the server console)
- `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` — initial Staff credentials

### 2. Run the Spring Boot Backend (MySQL 8.0)

```powershell
cd backend
$env:DB_PASSWORD="your_mysql_password"
$env:JWT_SECRET="replace-with-a-strong-64-character-random-signing-secret-for-jwt"
$env:TOKEN_PEPPER="replace-with-a-strong-random-pepper-for-one-time-tokens"
$env:SEED_ADMIN_PASSWORD="ChooseAStrongAdminPassword!"
$env:SEED_STAFF_PASSWORD="ChooseAStrongStaffPassword!"
mvn spring-boot:run
```

Flyway automatically creates the `college_quiz_portal` database (via `createDatabaseIfNotExist=true`), applies `V1__init_schema.sql`, and seeds roles, categories, initial users, sample published quizzes, and sample anonymous feedback.

#### Optional Local Demo Mode (No MySQL Password Required)
If you want to launch immediately without entering local MySQL credentials, use the `demo` profile (H2 in MySQL compatibility mode running the exact same Flyway SQL migration):

```powershell
cd backend
$env:SEED_ADMIN_PASSWORD="DemoAdmin!2026"
$env:SEED_STAFF_PASSWORD="DemoStaff!2026"
mvn spring-boot:run "-Dspring-boot.run.profiles=demo"
```

### 3. Run the React Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser:
- Student Portal Home: `http://localhost:5173/`
- Sample Quiz via URL: `http://localhost:5173/quiz/qz-cs201dsa`
- Sample Single Question via URL: `http://localhost:5173/q/qn-dsa10001`
- Anonymous Feedback Form: `http://localhost:5173/feedback`
- Admin / Staff Login: `http://localhost:5173/admin/login`

---

## Running Automated Tests

### Backend Integration Tests (JUnit 5 + MockMvc)
```powershell
cd backend
mvn test
```
Tests cover authentication, RBAC (`STAFF` 403 denial on feedback/settings), full quiz/question lifecycle, ZXing QR PNG generation, pre-submission answer hiding, one-time token duplicate prevention, exact option percentage & accuracy calculations, and anonymous feedback XSS sanitization + admin resolution.

### Frontend TypeScript & Production Build Check
```powershell
cd frontend
npm run build
```

---

## Production Deployment & Publishing Guides

> **Important Architecture Note**: Because this app has a **React frontend** (`frontend/`), a **Spring Boot Java backend** (`backend/`), and a **MySQL 8.0 database**, static hosts like **Vercel** or **Hostinger Shared Hosting** serve the React frontend, while the Spring Boot API + MySQL run on a backend/container host (**Render**, **Railway**, or **Hostinger VPS**).

### Option A: Publish Frontend on Vercel + Backend on Render + Free Managed MySQL (Recommended Cloud Stack)

1. **Create a MySQL 8.0 Database** (e.g., on [Aiven](https://aiven.io) free MySQL, [Railway](https://railway.app), or [TiDB Cloud](https://tidbcloud.com)):
   - Copy your JDBC connection URL:
     `jdbc:mysql://<HOST>:<PORT>/<DATABASE>?useSSL=true&requireSSL=true&serverTimezone=UTC`
   - Copy `DB_USERNAME` and `DB_PASSWORD`.
2. **Deploy the Spring Boot Backend on [Render](https://render.com)** (this repo includes `render.yaml` + `backend/Dockerfile`):
   - Click **New → Blueprint** (or **New → Web Service** pointing to `backend/Dockerfile`) and connect `https://github.com/vikash-2008-sj/quiz`.
   - Set environment variables:
     - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (from Step 1 — or temporarily set `SPRING_PROFILES_ACTIVE=demo` to test before connecting MySQL)
     - `JWT_SECRET` (64+ random chars) and `TOKEN_PEPPER` (random string)
     - `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=None`
     - `ALLOWED_ORIGINS=https://<your-vercel-domain>.vercel.app`
     - `PUBLIC_BASE_URL=https://<your-vercel-domain>.vercel.app`
     - `SEED_ADMIN_EMAIL=admin@college.edu`, `SEED_ADMIN_PASSWORD=<strong-password>`
     - `SEED_STAFF_EMAIL=staff@college.edu`, `SEED_STAFF_PASSWORD=<strong-password>`
   - Wait for health check `/api/public/health` to show `UP`, and copy your backend URL (e.g., `https://college-quiz-portal-api.onrender.com`).
3. **Deploy the React Frontend on [Vercel](https://vercel.com)** (this repo includes `frontend/vercel.json` for SPA routes like `/q/...` and `/feedback`):
   - Click **Add New → Project** and import `https://github.com/vikash-2008-sj/quiz`.
   - Set **Root Directory** to `frontend`.
   - Framework Preset: **Vite** (`npm run build`, Output Directory: `dist`).
   - Add Environment Variable:
     - `VITE_API_BASE_URL` = `https://<your-render-backend>.onrender.com/api`
   - Click **Deploy**.
   - Once deployed, copy your live `https://<project>.vercel.app` URL back into Render's `ALLOWED_ORIGINS` and `PUBLIC_BASE_URL` environment variables (and redeploy backend) so CORS and generated QR codes point to your live domain!

### Option B: Publish on Hostinger

- **Hostinger VPS (All-in-One: React + Spring Boot + MySQL 8.0 via Docker)**:
  1. SSH into your Hostinger VPS and install Docker + Docker Compose.
  2. Clone your repo: `git clone https://github.com/vikash-2008-sj/quiz.git && cd quiz`
  3. Copy `.env.example` to `.env`, set strong secrets, and set `PUBLIC_BASE_URL=https://yourdomain.com` and `ALLOWED_ORIGINS=https://yourdomain.com`.
  4. Run: `docker compose up -d --build`
  5. Point your domain DNS to the VPS IP and add free HTTPS via Caddy or Nginx + Certbot (with `access_log off;` on `/api/public/feedback`).
- **Hostinger Shared Web Hosting (Frontend only)**:
  1. Deploy the Spring Boot backend on Render/Railway first (Step 2 of Option A).
  2. Build the frontend locally with your live API URL:
     ```powershell
     cd frontend
     $env:VITE_API_BASE_URL="https://<your-backend-url>/api"
     npm run build
     ```
  3. Upload all contents of `frontend/dist/` (which automatically includes `.htaccess` for React Router SPA routes!) into Hostinger's `public_html/` folder via File Manager.

### Option C: Self-Hosted Docker Compose

1. Set strong values in `.env` (`DB_PASSWORD`, `JWT_SECRET`, `TOKEN_PEPPER`, `PUBLIC_BASE_URL`, `ALLOWED_ORIGINS`, `SEED_ADMIN_PASSWORD`, `SEED_STAFF_PASSWORD`).
2. Start the full stack (MySQL 8.0 + Spring Boot + Nginx-served React SPA):
   ```bash
   docker compose up -d --build
   ```
3. Place a TLS reverse proxy (Caddy, Traefik, or cloud load balancer) in front with `COOKIE_SECURE=true`, HTTPS enabled, and access logs disabled on `/api/public/feedback`.
