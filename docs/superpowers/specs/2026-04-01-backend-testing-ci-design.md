# Backend Testing & CI Pipeline Design

**Date:** 2026-04-01
**Goal:** Add Jest test suite for backend API routes, utilities, and models with GitHub Actions CI pipeline
**Scope:** C-level coverage — API endpoint tests + utility unit tests + model validation tests

---

## Test Framework

- **Test runner:** Jest
- **HTTP testing:** supertest (Express endpoint testing)
- **Database:** Real PostgreSQL (GitHub Actions service container)
- **Coverage:** Jest built-in `--coverage`

## Directory Structure

```
backend/
  __tests__/
    setup.js              — DB connection, table sync, cleanup helpers
    teardown.js           — Close DB connection
    helpers.js            — createTestUser(), getAuthAgent(), createTestCard()
    routes/
      auth.test.js        — Login, register, logout, /me
      cards.test.js       — CRUD, export, trash, restore, bulk ops, pagination
      users.test.js       — Role, approve, password, delete (admin-only)
      tags.test.js        — CRUD, stats, auth rejection
      public.test.js      — Public card view, vCard download (no auth)
    utils/
      encryption.test.js  — encrypt/decrypt round-trip, edge cases
      csv-parser.test.js  — RFC 4180 parseCSV compliance
      vcard.test.js       — vCard string generation
    models/
      user.test.js        — Creation, password hash hook, duplicate rejection
      card.test.js        — Creation, required fields, owner association
  jest.config.js          — Config with setup/teardown, testEnvironment: 'node'
```

## Test DB Strategy

- Each test suite: `beforeAll` → sync tables + create test fixtures (user, card)
- Each test suite: `afterAll` → truncate tables
- Global setup: connect to test DB, `sequelize.sync({ force: true })`
- Global teardown: close connection
- Test DB credentials via env vars (separate from production)

## Test Helpers (`__tests__/helpers.js`)

```js
// Creates a test user with password hashed by model hook
async function createTestUser(overrides = {})

// Returns a supertest agent with authenticated session cookie
async function getAuthAgent(app, user)

// Creates a test admin user
async function createTestAdmin()

// Creates a test business card owned by given user
async function createTestCard(ownerId, overrides = {})
```

## Route Tests

### auth.test.js (~12 tests)
- POST /auth/login — valid credentials → 200 + user object
- POST /auth/login — wrong password → 401
- POST /auth/login — non-existent user → 401
- POST /auth/login — unapproved user → 403
- POST /auth/register — valid data → 201
- POST /auth/register — duplicate username → 409
- POST /auth/register — missing required fields → 400
- GET /auth/me — authenticated → 200 + user data
- GET /auth/me — unauthenticated → 401
- POST /auth/logout — authenticated → 200
- PUT /auth/change-password — valid → 200
- PUT /auth/change-password — wrong old password → 400

### cards.test.js (~18 tests)
- GET /api/cards — authenticated → 200 + paginated list
- GET /api/cards?limit=200 — limit capped to 100
- GET /api/cards?page=-1 — page floored to 1
- POST /api/cards — valid data → 201
- POST /api/cards — missing firstName → 400
- PUT /api/cards/:id — valid update → 200
- PUT /api/cards/:id — other user's card → 403
- DELETE /api/cards/:id — soft delete → 200 + deletedAt set
- GET /api/cards/trash — returns soft-deleted cards
- POST /api/cards/:id/restore — restore from trash → 200
- DELETE /api/cards/:id/permanent — hard delete → 200
- DELETE /api/cards/trash/empty — empties trash → 200
- POST /api/cards/bulk-delete — deletes multiple → 200
- POST /api/cards/bulk-visibility — updates visibility → 200
- GET /api/cards/due-reminders — returns due cards
- GET /api/cards/export/excel — returns xlsx blob
- GET /api/cards/export/pdf — returns pdf blob
- GET /api/cards — unauthenticated → 401

### users.test.js (~10 tests)
- GET /api/users — admin → 200 + user list
- GET /api/users — non-admin → 403
- GET /api/users — unauthenticated → 401
- PUT /api/users/:id/role — admin toggles role → 200
- PUT /api/users/:id/role — non-admin → 403
- PUT /api/users/:id/approve — admin approves → 200
- PUT /api/users/:id/password — admin resets → 200
- PUT /api/users/:id/password — short password → 400
- DELETE /api/users/:id — admin deletes + transfers cards → 200
- DELETE /api/users/:id — self-delete blocked → 400

### tags.test.js (~8 tests)
- GET /api/tags — authenticated → 200 + tag list
- GET /api/tags — unauthenticated → 401
- GET /api/tags/stats — returns tag counts
- POST /api/tags — create tag → 201
- POST /api/tags — duplicate name handling
- PUT /api/tags/:id — update tag → 200
- PUT /api/tags/:id — other user's tag → 403
- DELETE /api/tags/:id — delete tag → 200

### public.test.js (~5 tests)
- GET /api/cards/stats — no auth required → 200 + totalCards
- GET /api/cards/public/:token — valid token → 200 + card data
- GET /api/cards/public/:token — invalid token → 404
- GET /api/cards/public/:token/vcf — valid token → 200 + vcf content-type
- GET /api/cards/public/:token/vcf — invalid token → 404

## Utility Unit Tests

### encryption.test.js (~5 tests)
- encrypt + decrypt round-trip → original text
- encrypt(null) → null
- decrypt(null) → null
- encrypt with missing key env var → null (no crash)
- decrypt with tampered ciphertext → null (no crash)

### csv-parser.test.js (~6 tests)
- Simple CSV → correct columns
- Quoted fields with commas → "Acme, Inc." parsed correctly
- Quoted fields with embedded newlines → handled
- Double-quoted escape → "He said ""hello""" → He said "hello"
- BOM prefix stripped
- Empty rows skipped

### vcard.test.js (~3 tests)
- Full card data → valid vCard 3.0 string
- Minimal card (only name) → valid vCard
- Special characters in name → properly escaped

## Model Tests

### user.test.js (~5 tests)
- Create user → password is hashed (not plaintext)
- Create user → isApproved defaults to false
- Duplicate username → throws unique constraint error
- validatePassword() → returns true for correct password
- validatePassword() → returns false for wrong password

### card.test.js (~4 tests)
- Create card with all fields → success
- Create card without ownerId → fails
- Card belongs to User association works
- Card has many Tags through BusinessCardTag

## GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

**Triggers:** push to main, pull_request to main

**Jobs:**
```yaml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15-alpine
      env:
        POSTGRES_USER: test_user
        POSTGRES_PASSWORD: test_pass
        POSTGRES_DB: test_db
      ports: ["5432:5432"]
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  env:
    DB_HOST: localhost
    DB_USER: test_user
    DB_PASSWORD: test_pass
    DB_NAME: test_db
    DB_PORT: 5432
    SESSION_SECRET: test-session-secret
    CRM_API_ENCRYPTION_KEY: test-encryption-key-32chars!!!
    NODE_ENV: test
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: npm
        cache-dependency-path: backend/package-lock.json
    - run: cd backend && npm ci
    - run: cd backend && npm test
```

**Test script in package.json:**
```json
"test": "jest --coverage --forceExit --detectOpenHandles",
"test:watch": "jest --watch"
```

## Dependencies to Install

```bash
cd backend
npm install --save-dev jest supertest @types/jest
```

## Jest Configuration (`backend/jest.config.js`)

```js
module.exports = {
  testEnvironment: 'node',
  globalSetup: './__tests__/setup.js',
  globalTeardown: './__tests__/teardown.js',
  testMatch: ['**/__tests__/**/*.test.js'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  testTimeout: 15000,
};
```

## Estimated Test Count

| Category | Tests |
|----------|-------|
| Route: auth | 12 |
| Route: cards | 18 |
| Route: users | 10 |
| Route: tags | 8 |
| Route: public | 5 |
| Utils: encryption | 5 |
| Utils: csv-parser | 6 |
| Utils: vcard | 3 |
| Models: user | 5 |
| Models: card | 4 |
| **Total** | **~76** |
