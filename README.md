# Secure Login System

A Node.js/Express login system with hashed passwords, input validation,
session management, and optional two-factor authentication (2FA).

## Features

- **Password hashing** — bcrypt, cost factor 12. Plaintext passwords are
  never stored or logged.
- **SQL injection protection** — all database queries use parameterized
  statements (`better-sqlite3`), never string concatenation.
- **Input validation** — username/email/password rules enforced with
  `express-validator`, plus sanitization (trim/escape).
- **Session management** — server-side sessions persisted to SQLite,
  `httpOnly` + `sameSite` cookies, session regeneration on login to prevent
  session fixation, and a logout route that fully destroys the session.
- **CSRF protection** — every form includes a per-session token that's
  verified on submit.
- **Account lockout** — 5 failed login attempts locks the account for 15
  minutes.
- **Rate limiting** — auth endpoints are throttled per IP.
- **Optional 2FA** — TOTP-based (compatible with Google Authenticator, Authy,
  1Password, etc.), enrolled via QR code from the dashboard, enforced as a
  second step at login once enabled.
- **Security headers** — via `helmet` (Content-Security-Policy, etc.).

## Requirements

- Node.js 18+ (tested on Node 22)
- npm

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create your environment file**

   ```bash
   cp .env.example .env
   ```

   Then open `.env` and set a strong random `SESSION_SECRET`. You can
   generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Paste the output as the value of `SESSION_SECRET` in `.env`.

3. **Run the app**

   ```bash
   npm start
   ```

   The app will be available at `http://localhost:3000`. The SQLite
   database file (`db/app.db`) and session store are created automatically
   on first run — no separate database setup needed.

4. **Try it out**

   - Go to `/register` and create an account (password needs 10+ chars,
     with an uppercase letter, lowercase letter, and a number).
   - Log in at `/login`.
   - From the dashboard, click **Set up 2FA** to scan the QR code with an
     authenticator app and enable two-factor login.
   - Log out and log back in — you'll now be prompted for a 6-digit code
     after your password.

## Project structure

```
secure-login-app/
├── server.js              # Express app entry point, security middleware, sessions
├── db/
│   └── database.js        # SQLite connection + schema
├── models/
│   └── userModel.js       # All DB access (parameterized queries only)
├── middleware/
│   ├── auth.js            # Route guards (requireAuth, requirePendingTotp)
│   ├── csrf.js            # CSRF token generation/verification
│   ├── rateLimiter.js     # Rate limiting config
│   └── validation.js      # express-validator rules
├── routes/
│   └── auth.js            # Register, login, logout, 2FA routes
├── views/                 # EJS templates (register, login, dashboard, 2FA, error)
├── public/
│   └── style.css
├── .env.example            # Copy to .env and fill in
└── package.json
```

## Notes on production readiness

This is a solid foundation, but before deploying publicly, also consider:

- Put the app behind HTTPS and set `NODE_ENV=production` (this makes
  cookies `secure`-only, requiring HTTPS).
- Add email verification for new accounts.
- Add a "forgot password" flow with time-limited, single-use reset tokens.
- Consider a managed Postgres/MySQL database instead of SQLite if you expect
  concurrent write load at scale.
- Set up centralized logging/alerting on the `login_events` table to detect
  brute-force patterns across accounts, not just per-account lockout.
- Run `npm audit` periodically and keep dependencies updated.

## Scripts

- `npm start` — run the server
- `npm run dev` — same, but you can wire in `nodemon` if you install it for
  auto-restart during development
