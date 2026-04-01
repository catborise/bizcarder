# Backend Testing & CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Jest test suite (~76 tests) for backend API routes, utilities, and models with GitHub Actions CI pipeline.

**Architecture:** Jest + supertest for HTTP testing against real PostgreSQL. App exported separately from listen() for testability. Global setup syncs DB schema, each suite creates/cleans its own fixtures.

**Tech Stack:** Jest, supertest, PostgreSQL 15, GitHub Actions, Node 18

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `backend/server.js` | Export `app` separately from `startServer()` |
| Modify | `backend/package.json` | Add jest, supertest devDeps + test scripts |
| Create | `backend/jest.config.js` | Jest configuration |
| Create | `backend/__tests__/setup.js` | Global setup: connect DB, sync schema |
| Create | `backend/__tests__/teardown.js` | Global teardown: close DB |
| Create | `backend/__tests__/helpers.js` | Test user/card/session helpers |
| Create | `backend/__tests__/utils/encryption.test.js` | Encryption unit tests |
| Create | `backend/__tests__/utils/csv-parser.test.js` | CSV parser unit tests |
| Create | `backend/__tests__/utils/vcard.test.js` | vCard generation unit tests |
| Create | `backend/__tests__/models/user.test.js` | User model tests |
| Create | `backend/__tests__/models/card.test.js` | BusinessCard model tests |
| Create | `backend/__tests__/routes/auth.test.js` | Auth endpoint tests |
| Create | `backend/__tests__/routes/cards.test.js` | Cards CRUD endpoint tests |
| Create | `backend/__tests__/routes/users.test.js` | User management endpoint tests |
| Create | `backend/__tests__/routes/tags.test.js` | Tag endpoint tests |
| Create | `backend/__tests__/routes/public.test.js` | Public endpoint tests |
| Create | `.github/workflows/test.yml` | CI pipeline |

---

### Task 1: Install Dependencies & Configure Jest

**Files:**
- Modify: `backend/package.json`
- Create: `backend/jest.config.js`

- [ ] **Step 1: Install test dependencies**

```bash
cd backend && npm install --save-dev jest supertest
```

- [ ] **Step 2: Add test scripts to package.json**

Add to the `"scripts"` section in `backend/package.json`:

```json
"test": "jest --coverage --forceExit --detectOpenHandles",
"test:watch": "jest --watch"
```

- [ ] **Step 3: Create jest.config.js**

Create `backend/jest.config.js`:

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

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/jest.config.js
git commit -m "chore: add jest and supertest for backend testing"
```

---

### Task 2: Export App for Supertest & Create Test Infrastructure

**Files:**
- Modify: `backend/server.js`
- Create: `backend/__tests__/setup.js`
- Create: `backend/__tests__/teardown.js`
- Create: `backend/__tests__/helpers.js`

- [ ] **Step 1: Modify server.js to export app**

At the end of `backend/server.js`, change the startup pattern. Find the current `startServer()` call and replace with:

```js
// Only start listening when run directly (not when imported by tests)
if (require.main === module) {
    const startServer = async () => {
        await connectDatabase();
        app.listen(port, () => {
            logger.info(`Server running on port ${port}`);
            startAutoCleanup();
        });
    };
    startServer();
}

module.exports = app;
```

Make sure the `app` variable and all middleware/routes are set up BEFORE this block (they already are).

- [ ] **Step 2: Create __tests__/setup.js**

```js
const sequelize = require('../config/database');
const { connectDatabase } = require('../models');

module.exports = async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();
    await sequelize.sync({ force: true });
    console.log('Test DB synced.');
};
```

- [ ] **Step 3: Create __tests__/teardown.js**

```js
const sequelize = require('../config/database');

module.exports = async () => {
    await sequelize.close();
    console.log('Test DB connection closed.');
};
```

- [ ] **Step 4: Create __tests__/helpers.js**

```js
const supertest = require('supertest');
const app = require('../server');
const { User, BusinessCard, Tag } = require('../models');

async function createTestUser(overrides = {}) {
    const defaults = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test1234!',
        displayName: 'Test User',
        role: 'user',
        isApproved: true,
    };
    return User.create({ ...defaults, ...overrides });
}

async function createTestAdmin(overrides = {}) {
    return createTestUser({
        username: 'adminuser',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'admin',
        ...overrides,
    });
}

async function createTestCard(ownerId, overrides = {}) {
    const defaults = {
        firstName: 'John',
        lastName: 'Doe',
        company: 'TestCorp',
        title: 'Engineer',
        email: 'john@testcorp.com',
        phone: '+905551234567',
        ownerId,
        visibility: 'private',
    };
    return BusinessCard.create({ ...defaults, ...overrides });
}

async function createTestTag(ownerId, overrides = {}) {
    return Tag.create({ name: 'TestTag', color: '#ff0000', ownerId, ...overrides });
}

async function getAuthAgent(user) {
    const agent = supertest.agent(app);
    await agent
        .post('/auth/login/local')
        .send({ username: user.username, password: 'Test1234!' })
        .expect(200);
    return agent;
}

async function cleanDatabase() {
    const sequelize = require('../config/database');
    await sequelize.query('TRUNCATE TABLE "BusinessCardTags", "BusinessCardHistories", "Interactions", "BusinessCards", "Tags", "AuditLogs", "DashboardTiles", "SystemSettings", "Sessions", "Users" RESTART IDENTITY CASCADE');
}

module.exports = { createTestUser, createTestAdmin, createTestCard, createTestTag, getAuthAgent, cleanDatabase };
```

- [ ] **Step 5: Commit**

```bash
git add backend/server.js backend/__tests__/
git commit -m "test: add test infrastructure — setup, teardown, helpers"
```

---

### Task 3: Utility Tests — Encryption

**Files:**
- Create: `backend/__tests__/utils/encryption.test.js`

- [ ] **Step 1: Write encryption tests**

```js
describe('Encryption Utils', () => {
    let encrypt, decrypt;

    beforeAll(() => {
        process.env.CRM_API_ENCRYPTION_KEY = 'test-encryption-key-32chars!!!ab';
        // Re-require to pick up env var
        jest.resetModules();
        ({ encrypt, decrypt } = require('../../utils/encryption'));
    });

    test('encrypt and decrypt round-trip returns original text', () => {
        const original = 'my-secret-api-key-12345';
        const encrypted = encrypt(original);
        expect(encrypted).not.toBe(original);
        expect(encrypted).toContain(':'); // iv:ciphertext format
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(original);
    });

    test('encrypt(null) returns null', () => {
        expect(encrypt(null)).toBeNull();
    });

    test('encrypt("") returns null', () => {
        expect(encrypt('')).toBeNull();
    });

    test('decrypt(null) returns null', () => {
        expect(decrypt(null)).toBeNull();
    });

    test('decrypt with tampered ciphertext returns null', () => {
        const encrypted = encrypt('test-data');
        const tampered = encrypted.replace(/[a-f0-9]{2}$/, 'xx');
        expect(decrypt(tampered)).toBeNull();
    });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npx jest __tests__/utils/encryption.test.js --verbose
```

- [ ] **Step 3: Commit**

```bash
git add backend/__tests__/utils/encryption.test.js
git commit -m "test: add encryption utility tests"
```

---

### Task 4: Utility Tests — CSV Parser

**Files:**
- Create: `backend/__tests__/utils/csv-parser.test.js`
- Modify: `backend/controllers/importController.js` (export parseCSV)

- [ ] **Step 1: Export parseCSV from importController**

The `parseCSV` function is currently a module-private function. Add it to exports at the bottom of `backend/controllers/importController.js`:

Find `module.exports` or the existing exports and add:

```js
// Add at the end of the file, or modify existing exports
exports.parseCSV = parseCSV;
```

If the file uses `exports.importCards = ...` and `exports.downloadTemplate = ...` pattern, just add `exports.parseCSV = parseCSV;` after the function definition.

- [ ] **Step 2: Write CSV parser tests**

```js
const { parseCSV } = require('../../controllers/importController');

describe('parseCSV', () => {
    test('parses simple CSV correctly', () => {
        const csv = 'name,email,phone\nJohn,john@test.com,555-1234\nJane,jane@test.com,555-5678';
        const rows = parseCSV(csv);
        expect(rows).toHaveLength(3);
        expect(rows[0]).toEqual(['name', 'email', 'phone']);
        expect(rows[1]).toEqual(['John', 'john@test.com', '555-1234']);
        expect(rows[2]).toEqual(['Jane', 'jane@test.com', '555-5678']);
    });

    test('handles quoted fields with commas', () => {
        const csv = 'name,company\nJohn,"Acme, Inc."\nJane,"Tech, LLC"';
        const rows = parseCSV(csv);
        expect(rows[1][1]).toBe('Acme, Inc.');
        expect(rows[2][1]).toBe('Tech, LLC');
    });

    test('handles double-quoted escapes', () => {
        const csv = 'name,note\nJohn,"He said ""hello"""';
        const rows = parseCSV(csv);
        expect(rows[1][1]).toBe('He said "hello"');
    });

    test('handles embedded newlines in quoted fields', () => {
        const csv = 'name,address\nJohn,"123 Main St\nSuite 4"';
        const rows = parseCSV(csv);
        expect(rows).toHaveLength(2);
        expect(rows[1][1]).toBe('123 Main St\nSuite 4');
    });

    test('handles CRLF line endings', () => {
        const csv = 'a,b\r\n1,2\r\n3,4';
        const rows = parseCSV(csv);
        expect(rows).toHaveLength(3);
        expect(rows[1]).toEqual(['1', '2']);
    });

    test('skips empty trailing row', () => {
        const csv = 'a,b\n1,2\n';
        const rows = parseCSV(csv);
        expect(rows).toHaveLength(2);
    });
});
```

- [ ] **Step 3: Run tests**

```bash
cd backend && npx jest __tests__/utils/csv-parser.test.js --verbose
```

- [ ] **Step 4: Commit**

```bash
git add backend/__tests__/utils/csv-parser.test.js backend/controllers/importController.js
git commit -m "test: add CSV parser utility tests"
```

---

### Task 5: Utility Tests — vCard

**Files:**
- Create: `backend/__tests__/utils/vcard.test.js`

- [ ] **Step 1: Write vCard tests**

```js
const { generateVCard } = require('../../utils/vcard');

describe('generateVCard', () => {
    test('generates valid vCard 3.0 with all fields', () => {
        const card = {
            firstName: 'John',
            lastName: 'Doe',
            company: 'TestCorp',
            title: 'Engineer',
            email: 'john@testcorp.com',
            phone: '+905551234567',
            website: 'https://testcorp.com',
            address: '123 Main St',
            city: 'Istanbul',
            country: 'Turkey',
            notes: 'Met at conference',
        };
        const vcard = generateVCard(card);
        expect(vcard).toContain('BEGIN:VCARD');
        expect(vcard).toContain('VERSION:3.0');
        expect(vcard).toContain('FN:John Doe');
        expect(vcard).toContain('N:Doe;John;;;');
        expect(vcard).toContain('ORG:TestCorp');
        expect(vcard).toContain('TITLE:Engineer');
        expect(vcard).toContain('EMAIL');
        expect(vcard).toContain('john@testcorp.com');
        expect(vcard).toContain('TEL');
        expect(vcard).toContain('+905551234567');
        expect(vcard).toContain('END:VCARD');
    });

    test('generates valid vCard with minimal fields', () => {
        const card = { firstName: 'Jane', lastName: 'Smith' };
        const vcard = generateVCard(card);
        expect(vcard).toContain('BEGIN:VCARD');
        expect(vcard).toContain('FN:Jane Smith');
        expect(vcard).toContain('END:VCARD');
        expect(vcard).not.toContain('ORG:');
        expect(vcard).not.toContain('TITLE:');
    });

    test('handles special characters in name', () => {
        const card = { firstName: 'Mühammet', lastName: 'Sağ', company: 'Şirket & Co.' };
        const vcard = generateVCard(card);
        expect(vcard).toContain('FN:Mühammet Sağ');
        expect(vcard).toContain('ORG:Şirket & Co.');
    });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npx jest __tests__/utils/vcard.test.js --verbose
```

- [ ] **Step 3: Commit**

```bash
git add backend/__tests__/utils/vcard.test.js
git commit -m "test: add vCard generation utility tests"
```

---

### Task 6: Model Tests — User

**Files:**
- Create: `backend/__tests__/models/user.test.js`

- [ ] **Step 1: Write User model tests**

```js
const { User } = require('../../models');
const { cleanDatabase } = require('../helpers');

describe('User Model', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    test('hashes password on create', async () => {
        const user = await User.create({
            username: 'hashtest',
            email: 'hash@test.com',
            password: 'plaintext123',
            isApproved: true,
        });
        expect(user.password).not.toBe('plaintext123');
        expect(user.password.startsWith('$2a$') || user.password.startsWith('$2b$')).toBe(true);
    });

    test('isApproved defaults to false', async () => {
        const user = await User.create({
            username: 'defaulttest',
            email: 'default@test.com',
            password: 'Test1234!',
        });
        expect(user.isApproved).toBe(false);
    });

    test('rejects duplicate username', async () => {
        await User.create({ username: 'unique', email: 'a@test.com', password: 'Test1234!' });
        await expect(
            User.create({ username: 'unique', email: 'b@test.com', password: 'Test1234!' })
        ).rejects.toThrow();
    });

    test('validatePassword returns true for correct password', async () => {
        const user = await User.create({
            username: 'pwtest',
            email: 'pw@test.com',
            password: 'CorrectPass123',
            isApproved: true,
        });
        const result = await user.validatePassword('CorrectPass123');
        expect(result).toBe(true);
    });

    test('validatePassword returns false for wrong password', async () => {
        const user = await User.create({
            username: 'pwtest2',
            email: 'pw2@test.com',
            password: 'CorrectPass123',
            isApproved: true,
        });
        const result = await user.validatePassword('WrongPass456');
        expect(result).toBe(false);
    });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npx jest __tests__/models/user.test.js --verbose
```

- [ ] **Step 3: Commit**

```bash
git add backend/__tests__/models/user.test.js
git commit -m "test: add User model tests — hashing, validation, uniqueness"
```

---

### Task 7: Model Tests — BusinessCard

**Files:**
- Create: `backend/__tests__/models/card.test.js`

- [ ] **Step 1: Write BusinessCard model tests**

```js
const { User, BusinessCard, Tag } = require('../../models');
const { cleanDatabase, createTestUser } = require('../helpers');

describe('BusinessCard Model', () => {
    let testUser;

    beforeEach(async () => {
        await cleanDatabase();
        testUser = await createTestUser();
    });

    test('creates card with all fields', async () => {
        const card = await BusinessCard.create({
            firstName: 'John',
            lastName: 'Doe',
            company: 'TestCorp',
            email: 'john@test.com',
            phone: '+905551234567',
            ownerId: testUser.id,
        });
        expect(card.id).toBeDefined();
        expect(card.firstName).toBe('John');
        expect(card.sharingToken).toBeDefined(); // UUID auto-generated
        expect(card.version).toBe(1);
    });

    test('rejects card without firstName', async () => {
        await expect(
            BusinessCard.create({ lastName: 'Doe', ownerId: testUser.id })
        ).rejects.toThrow();
    });

    test('belongs to User via ownerId', async () => {
        const card = await BusinessCard.create({
            firstName: 'Jane',
            ownerId: testUser.id,
        });
        const owner = await card.getOwner();
        expect(owner.id).toBe(testUser.id);
        expect(owner.username).toBe('testuser');
    });

    test('card can have tags through association', async () => {
        const card = await BusinessCard.create({ firstName: 'Tagged', ownerId: testUser.id });
        const tag = await Tag.create({ name: 'VIP', color: '#ff0000', ownerId: testUser.id });
        await card.addTag(tag);
        const tags = await card.getTags();
        expect(tags).toHaveLength(1);
        expect(tags[0].name).toBe('VIP');
    });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npx jest __tests__/models/card.test.js --verbose
```

- [ ] **Step 3: Commit**

```bash
git add backend/__tests__/models/card.test.js
git commit -m "test: add BusinessCard model tests — creation, validation, associations"
```

---

### Task 8: Route Tests — Auth

**Files:**
- Create: `backend/__tests__/routes/auth.test.js`

- [ ] **Step 1: Write auth route tests**

```js
const supertest = require('supertest');
const app = require('../../server');
const { cleanDatabase, createTestUser } = require('../helpers');

describe('Auth Routes', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    describe('POST /auth/login/local', () => {
        test('login with valid credentials returns 200', async () => {
            await createTestUser();
            const res = await supertest(app)
                .post('/auth/login/local')
                .send({ username: 'testuser', password: 'Test1234!' });
            expect(res.status).toBe(200);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.username).toBe('testuser');
        });

        test('login with wrong password returns 401', async () => {
            await createTestUser();
            const res = await supertest(app)
                .post('/auth/login/local')
                .send({ username: 'testuser', password: 'WrongPass' });
            expect(res.status).toBe(401);
        });

        test('login with non-existent user returns 401', async () => {
            const res = await supertest(app)
                .post('/auth/login/local')
                .send({ username: 'nonexistent', password: 'Test1234!' });
            expect(res.status).toBe(401);
        });

        test('login with unapproved user returns 403', async () => {
            await createTestUser({ isApproved: false });
            const res = await supertest(app)
                .post('/auth/login/local')
                .send({ username: 'testuser', password: 'Test1234!' });
            expect(res.status).toBe(403);
        });
    });

    describe('POST /auth/register', () => {
        test('register with valid data returns 201', async () => {
            const res = await supertest(app)
                .post('/auth/register')
                .send({ username: 'newuser', email: 'new@test.com', password: 'NewPass123!', displayName: 'New User' });
            expect(res.status).toBe(201);
        });

        test('register with duplicate username returns 409', async () => {
            await createTestUser();
            const res = await supertest(app)
                .post('/auth/register')
                .send({ username: 'testuser', email: 'other@test.com', password: 'NewPass123!', displayName: 'Dup' });
            expect(res.status).toBe(409);
        });

        test('register with missing fields returns 400', async () => {
            const res = await supertest(app)
                .post('/auth/register')
                .send({ username: 'incomplete' });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /auth/me', () => {
        test('authenticated user gets profile', async () => {
            const user = await createTestUser();
            const agent = supertest.agent(app);
            await agent.post('/auth/login/local').send({ username: 'testuser', password: 'Test1234!' });
            const res = await agent.get('/auth/me');
            expect(res.status).toBe(200);
            expect(res.body.username).toBe('testuser');
        });

        test('unauthenticated returns 401', async () => {
            const res = await supertest(app).get('/auth/me');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /auth/logout', () => {
        test('logout returns 200', async () => {
            const user = await createTestUser();
            const agent = supertest.agent(app);
            await agent.post('/auth/login/local').send({ username: 'testuser', password: 'Test1234!' });
            const res = await agent.post('/auth/logout');
            expect(res.status).toBe(200);
        });
    });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npx jest __tests__/routes/auth.test.js --verbose
```

- [ ] **Step 3: Commit**

```bash
git add backend/__tests__/routes/auth.test.js
git commit -m "test: add auth route tests — login, register, me, logout"
```

---

### Task 9: Route Tests — Cards

**Files:**
- Create: `backend/__tests__/routes/cards.test.js`

- [ ] **Step 1: Write cards route tests**

```js
const supertest = require('supertest');
const app = require('../../server');
const { cleanDatabase, createTestUser, createTestCard, getAuthAgent } = require('../helpers');

describe('Cards Routes', () => {
    let user, agent;

    beforeEach(async () => {
        await cleanDatabase();
        user = await createTestUser();
        agent = await getAuthAgent(user);
    });

    describe('GET /api/cards', () => {
        test('returns paginated card list', async () => {
            await createTestCard(user.id);
            await createTestCard(user.id, { firstName: 'Jane', email: 'jane@test.com' });
            const res = await agent.get('/api/cards');
            expect(res.status).toBe(200);
            expect(res.body.cards).toHaveLength(2);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.totalItems).toBe(2);
        });

        test('caps limit to 100', async () => {
            const res = await agent.get('/api/cards?limit=500');
            expect(res.status).toBe(200);
            expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
        });

        test('floors page to 1', async () => {
            const res = await agent.get('/api/cards?page=-5');
            expect(res.status).toBe(200);
            expect(res.body.pagination.currentPage).toBe(1);
        });

        test('unauthenticated returns 401', async () => {
            const res = await supertest(app).get('/api/cards');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/cards', () => {
        test('creates card with valid data', async () => {
            const res = await agent
                .post('/api/cards')
                .field('firstName', 'New')
                .field('lastName', 'Card')
                .field('email', 'new@card.com');
            expect(res.status).toBe(201);
            expect(res.body.firstName).toBe('New');
        });

        test('rejects card without firstName', async () => {
            const res = await agent
                .post('/api/cards')
                .field('lastName', 'NoFirst')
                .field('email', 'nofirst@test.com');
            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/cards/:id', () => {
        test('updates own card', async () => {
            const card = await createTestCard(user.id);
            const res = await agent
                .put(`/api/cards/${card.id}`)
                .field('firstName', 'Updated')
                .field('lastName', 'Name');
            expect(res.status).toBe(200);
            expect(res.body.firstName).toBe('Updated');
        });

        test('rejects update of other users card', async () => {
            const other = await createTestUser({ username: 'other', email: 'other@test.com' });
            const card = await createTestCard(other.id);
            const res = await agent
                .put(`/api/cards/${card.id}`)
                .field('firstName', 'Hacked');
            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/cards/:id', () => {
        test('soft deletes card', async () => {
            const card = await createTestCard(user.id);
            const res = await agent.delete(`/api/cards/${card.id}`);
            expect(res.status).toBe(200);
            const updated = await card.reload();
            expect(updated.deletedAt).not.toBeNull();
        });
    });

    describe('Trash Operations', () => {
        test('GET /api/cards/trash returns soft-deleted cards', async () => {
            const card = await createTestCard(user.id);
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.get('/api/cards/trash');
            expect(res.status).toBe(200);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        test('POST /api/cards/:id/restore restores card', async () => {
            const card = await createTestCard(user.id);
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.post(`/api/cards/${card.id}/restore`);
            expect(res.status).toBe(200);
            const restored = await card.reload();
            expect(restored.deletedAt).toBeNull();
        });

        test('DELETE /api/cards/:id/permanent hard deletes', async () => {
            const card = await createTestCard(user.id);
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.delete(`/api/cards/${card.id}/permanent`);
            expect(res.status).toBe(200);
        });

        test('DELETE /api/cards/trash/empty empties trash', async () => {
            const card = await createTestCard(user.id);
            await card.update({ deletedAt: new Date(), deletedBy: user.id });
            const res = await agent.delete('/api/cards/trash/empty');
            expect(res.status).toBe(200);
        });
    });

    describe('Bulk Operations', () => {
        test('POST /api/cards/bulk-delete deletes multiple', async () => {
            const c1 = await createTestCard(user.id, { firstName: 'Bulk1' });
            const c2 = await createTestCard(user.id, { firstName: 'Bulk2', email: 'b2@test.com' });
            const res = await agent
                .post('/api/cards/bulk-delete')
                .send({ ids: [c1.id, c2.id] });
            expect(res.status).toBe(200);
        });

        test('POST /api/cards/bulk-visibility updates visibility', async () => {
            const card = await createTestCard(user.id);
            const res = await agent
                .post('/api/cards/bulk-visibility')
                .send({ ids: [card.id], visibility: 'public' });
            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/cards/due-reminders', () => {
        test('returns cards with past due reminders', async () => {
            await createTestCard(user.id, { reminderDate: new Date('2020-01-01') });
            const res = await agent.get('/api/cards/due-reminders');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npx jest __tests__/routes/cards.test.js --verbose
```

- [ ] **Step 3: Commit**

```bash
git add backend/__tests__/routes/cards.test.js
git commit -m "test: add cards route tests — CRUD, trash, bulk ops, pagination"
```

---

### Task 10: Route Tests — Users

**Files:**
- Create: `backend/__tests__/routes/users.test.js`

- [ ] **Step 1: Write users route tests**

```js
const supertest = require('supertest');
const app = require('../../server');
const { cleanDatabase, createTestUser, createTestAdmin, createTestCard, getAuthAgent } = require('../helpers');

describe('Users Routes', () => {
    let admin, adminAgent;

    beforeEach(async () => {
        await cleanDatabase();
        admin = await createTestAdmin();
        adminAgent = await getAuthAgent(admin);
    });

    describe('GET /api/users', () => {
        test('admin gets user list', async () => {
            const res = await adminAgent.get('/api/users');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        test('non-admin gets 403', async () => {
            const user = await createTestUser({ username: 'regular', email: 'reg@test.com' });
            const userAgent = await getAuthAgent(user);
            const res = await userAgent.get('/api/users');
            expect(res.status).toBe(403);
        });

        test('unauthenticated gets 401', async () => {
            const res = await supertest(app).get('/api/users');
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/users/:id/role', () => {
        test('admin changes user role', async () => {
            const user = await createTestUser({ username: 'roletest', email: 'role@test.com' });
            const res = await adminAgent
                .put(`/api/users/${user.id}/role`)
                .send({ role: 'admin' });
            expect(res.status).toBe(200);
        });

        test('non-admin gets 403', async () => {
            const user = await createTestUser({ username: 'nonadmin', email: 'na@test.com' });
            const userAgent = await getAuthAgent(user);
            const res = await userAgent
                .put(`/api/users/${user.id}/role`)
                .send({ role: 'admin' });
            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/users/:id/approve', () => {
        test('admin approves user', async () => {
            const user = await createTestUser({ username: 'pending', email: 'pend@test.com', isApproved: false });
            const res = await adminAgent
                .put(`/api/users/${user.id}/approve`)
                .send({ isApproved: true });
            expect(res.status).toBe(200);
        });
    });

    describe('PUT /api/users/:id/password', () => {
        test('admin resets password', async () => {
            const user = await createTestUser({ username: 'pwreset', email: 'pwr@test.com' });
            const res = await adminAgent
                .put(`/api/users/${user.id}/password`)
                .send({ newPassword: 'NewSecurePass123!' });
            expect(res.status).toBe(200);
        });

        test('rejects short password', async () => {
            const user = await createTestUser({ username: 'shortpw', email: 'short@test.com' });
            const res = await adminAgent
                .put(`/api/users/${user.id}/password`)
                .send({ newPassword: '123' });
            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/users/:id', () => {
        test('admin deletes user and transfers cards', async () => {
            const user = await createTestUser({ username: 'todelete', email: 'del@test.com' });
            await createTestCard(user.id);
            const res = await adminAgent
                .delete(`/api/users/${user.id}`)
                .send({ transferCards: true });
            expect(res.status).toBe(200);
        });

        test('self-delete blocked', async () => {
            const res = await adminAgent
                .delete(`/api/users/${admin.id}`)
                .send({ transferCards: false });
            expect(res.status).toBe(400);
        });
    });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npx jest __tests__/routes/users.test.js --verbose
```

- [ ] **Step 3: Commit**

```bash
git add backend/__tests__/routes/users.test.js
git commit -m "test: add users route tests — role, approve, password, delete"
```

---

### Task 11: Route Tests — Tags

**Files:**
- Create: `backend/__tests__/routes/tags.test.js`

- [ ] **Step 1: Write tags route tests**

```js
const supertest = require('supertest');
const app = require('../../server');
const { cleanDatabase, createTestUser, createTestTag, getAuthAgent } = require('../helpers');

describe('Tags Routes', () => {
    let user, agent;

    beforeEach(async () => {
        await cleanDatabase();
        user = await createTestUser();
        agent = await getAuthAgent(user);
    });

    test('GET /api/tags returns tag list', async () => {
        await createTestTag(user.id);
        const res = await agent.get('/api/tags');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/tags unauthenticated returns 401', async () => {
        const res = await supertest(app).get('/api/tags');
        expect(res.status).toBe(401);
    });

    test('GET /api/tags/stats returns tag counts', async () => {
        await createTestTag(user.id);
        const res = await agent.get('/api/tags/stats');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('POST /api/tags creates tag', async () => {
        const res = await agent
            .post('/api/tags')
            .send({ name: 'NewTag', color: '#00ff00' });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('NewTag');
    });

    test('PUT /api/tags/:id updates tag', async () => {
        const tag = await createTestTag(user.id);
        const res = await agent
            .put(`/api/tags/${tag.id}`)
            .send({ name: 'Updated', color: '#0000ff' });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Updated');
    });

    test('PUT /api/tags/:id rejects other users tag', async () => {
        const other = await createTestUser({ username: 'other', email: 'other@test.com' });
        const tag = await createTestTag(other.id);
        const res = await agent
            .put(`/api/tags/${tag.id}`)
            .send({ name: 'Hacked' });
        expect(res.status).toBe(403);
    });

    test('DELETE /api/tags/:id deletes own tag', async () => {
        const tag = await createTestTag(user.id);
        const res = await agent.delete(`/api/tags/${tag.id}`);
        expect(res.status).toBe(200);
    });

    test('DELETE /api/tags/:id rejects other users tag', async () => {
        const other = await createTestUser({ username: 'tagowner', email: 'to@test.com' });
        const tag = await createTestTag(other.id);
        const res = await agent.delete(`/api/tags/${tag.id}`);
        expect(res.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npx jest __tests__/routes/tags.test.js --verbose
```

- [ ] **Step 3: Commit**

```bash
git add backend/__tests__/routes/tags.test.js
git commit -m "test: add tags route tests — CRUD, auth, ownership"
```

---

### Task 12: Route Tests — Public

**Files:**
- Create: `backend/__tests__/routes/public.test.js`

- [ ] **Step 1: Write public route tests**

```js
const supertest = require('supertest');
const app = require('../../server');
const { cleanDatabase, createTestUser, createTestCard } = require('../helpers');

describe('Public Routes', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    describe('GET /api/cards/stats', () => {
        test('returns stats without auth', async () => {
            const user = await createTestUser();
            await createTestCard(user.id);
            const res = await supertest(app).get('/api/cards/stats');
            expect(res.status).toBe(200);
            expect(res.body.totalCards).toBeDefined();
        });
    });

    describe('GET /api/cards/public/:token', () => {
        test('valid token returns card data', async () => {
            const user = await createTestUser();
            const card = await createTestCard(user.id, { visibility: 'public' });
            const res = await supertest(app).get(`/api/cards/public/${card.sharingToken}`);
            expect(res.status).toBe(200);
            expect(res.body.firstName).toBe('John');
        });

        test('invalid token returns 404', async () => {
            const res = await supertest(app).get('/api/cards/public/00000000-0000-0000-0000-000000000000');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/cards/public/:token/vcf', () => {
        test('valid token returns vCard', async () => {
            const user = await createTestUser();
            const card = await createTestCard(user.id, { visibility: 'public' });
            const res = await supertest(app).get(`/api/cards/public/${card.sharingToken}/vcf`);
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/text\/vcard|text\/x-vcard/);
        });

        test('invalid token returns 404', async () => {
            const res = await supertest(app).get('/api/cards/public/00000000-0000-0000-0000-000000000000/vcf');
            expect(res.status).toBe(404);
        });
    });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npx jest __tests__/routes/public.test.js --verbose
```

- [ ] **Step 3: Commit**

```bash
git add backend/__tests__/routes/public.test.js
git commit -m "test: add public route tests — stats, card profile, vCard"
```

---

### Task 13: GitHub Actions CI Workflow

**Files:**
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Create workflow file**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/test.yml`:

```yaml
name: Backend Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
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
      DB_POOL_MIN: 1
      DB_POOL_MAX: 5
      SESSION_SECRET: test-session-secret-ci
      CRM_API_ENCRYPTION_KEY: test-encryption-key-32chars!!!ab
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Run tests
        run: cd backend && npm test

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: backend/coverage/
          retention-days: 7
```

- [ ] **Step 2: Add coverage/ to .gitignore**

Add to the root `.gitignore`:

```
backend/coverage/
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/test.yml .gitignore
git commit -m "ci: add GitHub Actions workflow for backend tests"
```

---
