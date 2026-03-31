# CLAUDE.md — Bizcarder CRM

## Commands

```bash
# Docker (recommended)
docker-compose up --build

# Manual — Backend
cd backend && npm install && npm run dev    # port 5000

# Manual — Frontend
cd frontend && npm install && npm run dev   # port 5173

# Frontend build
cd frontend && npm run build

# Default login: admin / admin
```

## Architecture

Monorepo: `backend/` (Express + PostgreSQL) and `frontend/` (React 18 + Vite).

```
backend/
  server.js          # Entry point, CORS, session, helmet
  routes/            # auth, cards, users, tags, interactions, settings, logs
  models/            # Sequelize models (User, BusinessCard, Tag, Interaction, etc.)
  middleware/auth.js  # requireAuth, requireAdmin, requireRole
  config/            # database.js, passport.js (local + SAML)
  utils/             # encryption, vcard, logger, helpers
  controllers/       # importController, ocrController
frontend/
  src/App.jsx        # Router, nav, providers
  src/components/    # All page components
  src/context/       # AuthContext, ThemeContext, NotificationContext
  src/i18n/          # i18next config + locales/en/*.json, locales/tr/*.json
  src/index.css      # Design tokens, all responsive CSS
```

## Key Conventions

### CSS Design System
- Design tokens in `frontend/src/index.css` `:root` — spacing (`--space-1` to `--space-12`), gradients (`--gradient-primary`, etc.), glass variables
- Component layout classes: `.mycard-grid`, `.usermgmt-card`, `.trash-card`, `.bulk-bar`, `.bottom-nav`
- Mobile breakpoint: `768px`. Use doubled-class specificity (`.foo.foo`) instead of `!important` for overrides
- Prefer CSS classes over inline styles for responsive behavior

### i18n
- Namespaces: `common`, `cards`, `pages`, `dashboard`, `auth`, `filters`, `help`, `settings`, `users`, `about`
- Locale files: `frontend/src/i18n/locales/{en,tr}/<namespace>.json`
- Always use `t('namespace:key')` with explicit namespace prefix
- Never hardcode Turkish fallbacks in `t()` second argument — add keys to both locale files instead
- Dates: use `i18n.language === 'tr' ? 'tr-TR' : 'en-US'` for `toLocaleDateString()`

### Auth
- `requireAuth` middleware on all API routes (except public: `/api/settings` GET, `/contact-profile/:token`)
- `requireAdmin` for user management routes
- Session-based auth via Passport.js (local + SAML)

### File Uploads
- Multer with MIME whitelist (`image/jpeg`, `image/png`, `image/gif`, `image/webp`)
- Card images: max 5MB. Branding: max 2MB
- Stored in `backend/uploads/`

## Gotchas

- `cards:addCard` is an OBJECT (contains validation messages), not a string — don't use it as a button label
- `<nav>` element styles scoped to `.top-nav` class — bottom nav uses `.bottom-nav` (don't use bare `nav {}` selector)
- Pagination `limit` capped at 100 server-side, export IDs capped at 500
- `glass-container` uses `var(--glass-bg-solid)` (no backdrop-filter) for performance
- Modal uses CSS class `.modal-content` for styles (not inline) — mobile goes full-screen at 768px
- Language switching logic lives inline in `UserMenu.jsx` dropdown

## Multi-Instance / Horizontal Scaling

Sessions are stored in PostgreSQL (SequelizeStore) — no instance affinity needed.
File uploads use a shared Docker volume (`crm_uploads`).

- **Rate limiting**: Set `REDIS_URL` env var to enable distributed rate limiting. Without Redis, each instance has its own in-memory counters (limits are bypassable).
- **Trash cleanup**: Uses `pg_advisory_lock` — only one instance runs cleanup at a time.
- **DB pool**: Configurable via `DB_POOL_MIN` (default 2) and `DB_POOL_MAX` (default 10). With N instances, total connections = N × max.
- **All write routes** use Sequelize transactions with `LOCK.UPDATE` to prevent race conditions.
