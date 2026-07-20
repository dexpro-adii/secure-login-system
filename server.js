require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const SqliteSessionStore = require('better-sqlite3-session-store')(session);
const helmet = require('helmet');

const db = require('./db/database');
const csrfProtection = require('./middleware/csrf');
const { authLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET && IS_PRODUCTION) {
  throw new Error('SESSION_SECRET must be set in production');
}
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'dev-only-secret-change-me';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // needed for correct req.ip / secure cookies behind a proxy

// Security headers (CSP, no-sniff, frameguard, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'], // data: needed for the 2FA QR code
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
  })
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sessions persisted to SQLite so they survive server restarts (a MemoryStore
// would leak memory and lose sessions on every restart - fine for a demo,
// unsuitable for production).
app.use(
  session({
    store: new SqliteSessionStore({
      client: db,
      expired: {
        clear: true,
        intervalMs: 15 * 60 * 1000, // clear expired sessions every 15 min
      },
    }),
    name: 'connect.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // not readable via document.cookie / JS -> mitigates XSS token theft
      secure: IS_PRODUCTION, // HTTPS only in production
      sameSite: 'lax', // baseline CSRF mitigation, paired with explicit CSRF tokens below
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  })
);

app.use(csrfProtection);

app.use('/', authLimiter, authRoutes);

app.get('/', (req, res) => {
  res.redirect(req.session.userId ? '/dashboard' : '/login');
});

// 404
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found.' });
});

// Centralized error handler - never leak stack traces or internals to the client.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    message: 'Something went wrong. Please try again.',
  });
});

app.listen(PORT, () => {
  console.log(`Secure login app running at http://localhost:${PORT}`);
});
