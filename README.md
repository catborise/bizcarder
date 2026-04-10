<p align="center">
  <img src="docs/logo-placeholder.png" alt="Bizcarder" width="80" />
</p>

<h1 align="center">Bizcarder</h1>

<p align="center">
  <strong>Turn paper business cards into a powerful CRM — scan, organize, follow up.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/react-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/node-22-green?logo=node.js" alt="Node 22" />
  <img src="https://img.shields.io/badge/postgres-16-336791?logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="MIT License" />
  <img src="https://img.shields.io/badge/i18n-TR%20%7C%20EN-orange" alt="Multilingual" />
</p>

---

## What is Bizcarder?

Bizcarder is an open-source CRM that turns physical business cards into structured, searchable contacts. Snap a photo, let OCR extract the details, then manage leads, log interactions, and export anywhere.

**Key highlights:**

- **AI-powered OCR** — Tesseract.js reads business cards so you don't have to type
- **Full CRM pipeline** — Lead status, priority stars, tags, reminders, interaction history
- **Digital business card** — Share your own contact via QR code or public profile link
- **Mobile-first PWA** — Installable, works offline, syncs when back online
- **Enterprise-ready** — SAML/SSO, role-based access, audit logs, 2FA

---

## Quick Start

```bash
git clone https://github.com/catborise/bizcarder.git
cd bizcarder
make install
```

That's it — `make install` copies `.env.example`, builds all containers, starts the services, and seeds the database. Open [localhost:5173](http://localhost:5173) and log in with `admin` / `admin`.

> Change the default password immediately.

<details>
<summary><strong>Alternative setup (without Make)</strong></summary>

```bash
cp .env.example .env       # edit with your settings
docker compose up --build -d
docker compose exec backend node scripts/seed.js
```

**Without Docker:**

```bash
# Backend (port 5000)
cd backend && npm install && npm run dev

# Frontend (port 5173)
cd frontend && npm install && npm run dev
```

</details>

---

## Features

| Category          | What you get                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------- |
| **Scan & Import** | OCR card scanning, bulk CSV/Excel import, drag-and-drop upload                              |
| **CRM**           | Lead status (hot/warm/cold), 5-star priority, tags, interaction log, follow-up reminders    |
| **Digital Card**  | Personal vCard page, QR code sharing, public profile link                                   |
| **Export**        | Excel, PDF, vCard (.vcf) — single or bulk                                                   |
| **Collaboration** | Multi-user with admin/user roles, card visibility (public/private), shared tag system       |
| **Security**      | Local auth + SAML 2.0 SSO, two-factor auth (TOTP), session encryption, audit logs           |
| **UI/UX**         | Dark/light themes, glassmorphism design, responsive grid, bottom nav, FAB, page transitions |
| **Offline**       | PWA installable, IndexedDB cache, auto-sync on reconnect                                    |
| **i18n**          | Turkish and English with real-time switching                                                |

---

## Tech Stack

```
Frontend                          Backend                         Infra
────────────────────────          ──────────────────────          ──────────────
React 19 + Vite 8                 Express 5 (Node 22)             Docker Compose
React Router 7                    Sequelize ORM                    PostgreSQL 16
MUI v7 + Framer Motion            Passport.js (Local + SAML)       Redis 7
i18next (TR/EN)                   Multer 2 + Helmet 8              Nginx (prod)
Dexie 4 (IndexedDB)               Winston logger                   Alpine Linux
Tesseract.js 7 (OCR)              bcryptjs 3 + speakeasy (2FA)
```

---

## Architecture

```
browser ──→ nginx:80 (static SPA)
              │
              └──→ express:5000 (API)
                       │
                       ├──→ PostgreSQL:5432 (data + sessions)
                       ├──→ Redis:6379 (rate limiting)
                       └──→ filesystem (uploads, backups)
```

```
project/
├── backend/
│   ├── routes/         # API endpoints (auth, cards, users, tags, ...)
│   ├── models/         # Sequelize models
│   ├── middleware/      # auth, rate limiting
│   ├── utils/          # encryption, vcard, logger
│   └── scripts/        # backup, restore, seed
├── frontend/
│   ├── src/components/ # React pages & UI
│   ├── src/context/    # Auth, Theme, Notification providers
│   └── src/i18n/       # Locale files (en, tr)
└── scripts/
    └── pg-upgrade.sh   # PostgreSQL version migration
```

---

## Make Commands

The project includes a `Makefile` that wraps every common operation into short, memorable commands. No more copy-pasting long `docker compose exec` lines — just `make <target>`.

Run `make help` to see all available targets:

| Command                          | Description                                                  |
| -------------------------------- | ------------------------------------------------------------ |
| **Setup**                        |                                                              |
| `make install`                   | First-time setup: copy `.env`, build, start, seed            |
| `make build`                     | Rebuild images and start                                     |
| `make fresh`                     | Wipe everything and rebuild from scratch (asks confirmation) |
| **Lifecycle**                    |                                                              |
| `make up`                        | Start all containers                                         |
| `make down`                      | Stop all containers                                          |
| `make restart`                   | Restart all containers                                       |
| `make status`                    | Show container status                                        |
| **Logs**                         |                                                              |
| `make logs`                      | Tail all service logs                                        |
| `make logs-backend`              | Tail backend logs only                                       |
| `make logs-frontend`             | Tail frontend logs only                                      |
| **Database**                     |                                                              |
| `make seed`                      | Seed default admin user and dashboard tiles                  |
| `make migrate`                   | Run pending database migrations                              |
| `make backup`                    | Create database + uploads backup                             |
| `make restore`                   | List available backups                                       |
| `make restore T=20260403_120000` | Restore from a specific backup                               |
| `make pg-upgrade`                | Upgrade PostgreSQL version (migration script)                |
| **Testing**                      |                                                              |
| `make test`                      | Run all tests (backend + frontend)                           |
| `make test-backend`              | Run backend tests only (Jest)                                |
| `make test-frontend`             | Run frontend tests only (Vitest)                             |
| **Code quality**                 |                                                              |
| `make lint`                      | Run ESLint on frontend                                       |
| `make format`                    | Format all code with Prettier                                |
| **Production**                   |                                                              |
| `make prod`                      | Build and start production stack (Caddy, no Nginx)           |
| `make prod-up`                   | Start production containers                                  |
| `make prod-down`                 | Stop production containers                                   |
| `make prod-logs`                 | Tail production logs                                         |
| **Shell access**                 |                                                              |
| `make shell`                     | Open shell in backend container                              |
| `make shell-db`                  | Open psql shell                                              |
| `make shell-redis`               | Open redis-cli shell                                         |
| **Cleanup**                      |                                                              |
| `make clean`                     | Stop containers, remove images (keeps data)                  |

Last 7 backups are retained automatically.

<details>
<summary><strong>Set up daily automatic backups</strong></summary>

```bash
crontab -e
# Add (adjust path):
0 3 * * * cd /path/to/project && make backup >> /var/log/crm_backup.log 2>&1
```

</details>

<details>
<summary><strong>PostgreSQL version upgrade</strong></summary>

When changing PostgreSQL major versions (e.g., 16 → 17):

```bash
# 1. Edit docker-compose.yml → image: postgres:17-alpine
# 2. Match client in backend/Dockerfile → postgresql17-client
# 3. Run:
make pg-upgrade
```

The script auto-detects the version mismatch, dumps your data, swaps the volume, restores everything, and starts all services. Backups are kept in `.pg-upgrade-backups/`. Use `--force` to skip the confirmation prompt.

</details>

---

## Authentication

| Method       | Description                                                   |
| ------------ | ------------------------------------------------------------- |
| **Local**    | Username/password with registration + admin approval workflow |
| **SAML 2.0** | Enterprise SSO via Shibboleth or any SAML IdP                 |
| **2FA**      | Optional TOTP second factor (Google Authenticator, etc.)      |

See [SAML_GUIDE.md](SAML_GUIDE.md) for SSO configuration.

---

## Environment Variables

Key variables in `.env` (see `.env.example` for the full list):

| Variable            | Description                   | Default                 |
| ------------------- | ----------------------------- | ----------------------- |
| `POSTGRES_USER`     | Database user                 | `crm_user`              |
| `POSTGRES_PASSWORD` | Database password             | `crm_password`          |
| `POSTGRES_DB`       | Database name                 | `crm_db`                |
| `SESSION_SECRET`    | Session encryption key        | _(required)_            |
| `VITE_API_URL`      | Backend URL for frontend      | `http://localhost:5000` |
| `REDIS_URL`         | Redis connection string       | `redis://redis:6379`    |
| `SAML_ENTRY_POINT`  | SAML IdP login URL            | _(optional)_            |
| `SMTP_HOST`         | Mail server for notifications | _(optional)_            |

---

## Testing

```bash
make test            # run all tests
make test-backend    # 227 tests — Jest + Supertest
make test-frontend   # 53 tests — Vitest + React Testing Library
```

Tests never touch production data — the backend test suite uses an isolated `crm_db_test` database.

---

## License

MIT — see [LICENSE](LICENSE) for details.
