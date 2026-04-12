# CLAUDE.md — Bizcarder CRM

## Commands

```bash
# Dev (recommended)
make install          # first-time: build, migrate, seed
make up               # start backend + db + redis
make dev-frontend     # start Vite dev server (separate terminal)

# Production
make prod             # Caddy + backend + db + redis
make prod-upgrade     # pull, rebuild, migrate, seed (prod)

# Manual — Backend
cd backend && npm install && npm run dev    # port 5000

# Manual — Frontend
cd frontend && npm install && npm run dev   # port 5173

# Default login: admin / (see ADMIN_DEFAULT_PASSWORD in .env)
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
- Locale files (source of truth): `frontend/src/i18n/locales/{en,tr}/<namespace>.json`
- **Lazy loading**: `common`, `cards`, `dashboard`, `auth`, `pages` are bundled eagerly. `help`, `about`, `users`, `settings`, `filters` are fetched at runtime via `i18next-http-backend` from `/locales/{lng}/{ns}.json`.
- **Public copies**: `frontend/public/locales/` contains HTTP-served copies of ALL locale files. When you edit a namespace JSON in `src/i18n/locales/`, also update the matching file in `public/locales/` (or re-run `cp frontend/src/i18n/locales/**/*.json` to the public counterpart).
- Always use `t('namespace:key')` with explicit namespace prefix
- Never hardcode Turkish fallbacks in `t()` second argument — add keys to both locale files instead
- Dates: use `i18n.language === 'tr' ? 'tr-TR' : 'en-US'` for `toLocaleDateString()`
- **Backend API messages**: Never return hardcoded Turkish or English strings in error/success responses. Use `errorCode` / `messageCode` with UPPER_SNAKE_CASE codes (e.g., `{ errorCode: 'AUTH_REQUIRED' }`). Frontend resolves these via `auth:errors.{CODE}` i18n keys. Add translations to both `en` and `tr` locale files.
- **Validation messages** (express-validator `.withMessage()`): Use UPPER_SNAKE_CASE codes, not human-readable strings. Frontend maps these through i18n the same way.

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

## Operations

```bash
make backup                       # Backup database + uploads
make restore                      # List available backups
make restore T=20260403_120000    # Restore from backup
make seed                         # Seed default admin user + dashboard tiles
make migrate                      # Run pending database migrations
make pg-upgrade                   # Upgrade PostgreSQL version
```

## Multi-Instance / Horizontal Scaling

Sessions are stored in PostgreSQL (SequelizeStore) — no instance affinity needed.
File uploads use a shared Docker volume (`crm_uploads`).

- **Rate limiting**: Set `REDIS_URL` env var to enable distributed rate limiting. Without Redis, each instance has its own in-memory counters (limits are bypassable).
- **Trash cleanup**: Uses `pg_advisory_lock` — only one instance runs cleanup at a time.
- **DB pool**: Configurable via `DB_POOL_MIN` (default 2) and `DB_POOL_MAX` (default 10). With N instances, total connections = N × max.
- **All write routes** use Sequelize transactions with `LOCK.UPDATE` to prevent race conditions.
