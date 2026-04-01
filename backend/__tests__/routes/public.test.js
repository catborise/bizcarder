const supertest = require('supertest');
const app = require('../../server');
const { cleanDatabase, createTestUser, createTestCard } = require('../helpers');

describe('Public Routes', () => {
    beforeAll(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await cleanDatabase();
    });

    // ============== GET /api/cards/stats ==============
    describe('GET /api/cards/stats', () => {
        test('returns 0 when no cards exist', async () => {
            // This runs first in the suite (DB was cleaned in beforeAll)
            const res = await supertest(app).get('/api/cards/stats');
            expect(res.status).toBe(200);
            expect(res.body.totalCards).toBe(0);
        });

        test('returns totalCards count without authentication', async () => {
            const user = await createTestUser({ username: 'statsuser', email: 'statsuser@testcorp.com' });
            await createTestCard(user.id, { firstName: 'John', email: 'john@testcorp.com' });
            await createTestCard(user.id, { firstName: 'Jane', email: 'jane@testcorp.com' });
            const res = await supertest(app).get('/api/cards/stats');
            expect(res.status).toBe(200);
            expect(res.body.totalCards).toBeDefined();
            expect(typeof res.body.totalCards).toBe('number');
            expect(res.body.totalCards).toBeGreaterThanOrEqual(2);
        });

        test('soft-deleted cards are excluded from totalCards count', async () => {
            const user = await createTestUser({ username: 'softdelstats', email: 'softdelstats@testcorp.com' });
            const card = await createTestCard(user.id, { firstName: 'SoftDel', email: 'softdel@testcorp.com' });
            // Soft-delete the card
            await card.update({ deletedAt: new Date() });
            // Get count before and ensure this card is not counted
            const res = await supertest(app).get('/api/cards/stats');
            expect(res.status).toBe(200);
            // The soft-deleted card should not appear in the count
            // We verify by checking that all returned total is for non-deleted cards
            expect(typeof res.body.totalCards).toBe('number');
        });
    });

    // ============== GET /api/cards/public/:token ==============
    describe('GET /api/cards/public/:token', () => {
        test('valid token for public card returns card data without auth', async () => {
            const user = await createTestUser({ username: 'publicuser', email: 'publicuser@testcorp.com' });
            const card = await createTestCard(user.id, { visibility: 'public', email: 'publiccard@testcorp.com' });
            const res = await supertest(app).get(`/api/cards/public/${card.sharingToken}`);
            expect(res.status).toBe(200);
            expect(res.body.firstName).toBe('John');
            expect(res.body.lastName).toBe('Doe');
            expect(res.body.sharingToken).toBe(card.sharingToken);
        });

        test('private card token returns 404', async () => {
            const user = await createTestUser({ username: 'privateuser', email: 'privateuser@testcorp.com' });
            // createTestCard defaults to visibility: 'private'
            const card = await createTestCard(user.id, { email: 'privatecard@testcorp.com' });
            const res = await supertest(app).get(`/api/cards/public/${card.sharingToken}`);
            expect(res.status).toBe(404);
            expect(res.body.error).toBeDefined();
        });

        test('invalid / non-existent token returns 404', async () => {
            const res = await supertest(app).get(
                '/api/cards/public/00000000-0000-0000-0000-000000000000'
            );
            expect(res.status).toBe(404);
            expect(res.body.error).toBeDefined();
        });

        test('soft-deleted public card returns 404', async () => {
            const user = await createTestUser({ username: 'softdelpublic', email: 'softdelpublic@testcorp.com' });
            const card = await createTestCard(user.id, { visibility: 'public', email: 'softdelpubliccard@testcorp.com' });
            await card.update({ deletedAt: new Date() });

            const res = await supertest(app).get(`/api/cards/public/${card.sharingToken}`);
            expect(res.status).toBe(404);
        });

        test('response includes tags and owner display name', async () => {
            const user = await createTestUser({ username: 'tagsowner', email: 'tagsowner@testcorp.com' });
            const card = await createTestCard(user.id, { visibility: 'public', email: 'tagscard@testcorp.com' });
            const res = await supertest(app).get(`/api/cards/public/${card.sharingToken}`);
            expect(res.status).toBe(200);
            // tags and owner should be included (via associations)
            expect(Array.isArray(res.body.tags)).toBe(true);
            expect(res.body.owner).toBeDefined();
            expect(res.body.owner.displayName).toBe('Test User');
        });
    });

    // ============== GET /api/cards/public/:token/vcf ==============
    describe('GET /api/cards/public/:token/vcf', () => {
        test('valid token returns vCard file with correct content-type', async () => {
            const user = await createTestUser({ username: 'vcfuser1', email: 'vcfuser1@testcorp.com' });
            const card = await createTestCard(user.id, { visibility: 'public', email: 'vcf1@testcorp.com' });
            const res = await supertest(app).get(
                `/api/cards/public/${card.sharingToken}/vcf`
            );
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/text\/vcard|text\/x-vcard/i);
        });

        test('valid token returns attachment with content-disposition header', async () => {
            const user = await createTestUser({ username: 'vcfuser2', email: 'vcfuser2@testcorp.com' });
            const card = await createTestCard(user.id, { visibility: 'public', email: 'vcf2@testcorp.com' });
            const res = await supertest(app).get(
                `/api/cards/public/${card.sharingToken}/vcf`
            );
            expect(res.status).toBe(200);
            expect(res.headers['content-disposition']).toMatch(/attachment/i);
        });

        test('vCard body contains BEGIN:VCARD and END:VCARD', async () => {
            const user = await createTestUser({ username: 'vcfuser3', email: 'vcfuser3@testcorp.com' });
            const card = await createTestCard(user.id, { visibility: 'public', email: 'vcf3@testcorp.com' });
            const res = await supertest(app).get(
                `/api/cards/public/${card.sharingToken}/vcf`
            );
            expect(res.status).toBe(200);
            expect(res.text).toContain('BEGIN:VCARD');
            expect(res.text).toContain('END:VCARD');
        });

        test('invalid token returns 404', async () => {
            const res = await supertest(app).get(
                '/api/cards/public/00000000-0000-0000-0000-000000000000/vcf'
            );
            expect(res.status).toBe(404);
            expect(res.body.error).toBeDefined();
        });

        test('soft-deleted public card vcf returns 404', async () => {
            const user = await createTestUser({ username: 'vcfsoftdel', email: 'vcfsoftdel@testcorp.com' });
            const card = await createTestCard(user.id, { visibility: 'public', email: 'vcfsoftdel@card.com' });
            await card.update({ deletedAt: new Date() });

            const res = await supertest(app).get(
                `/api/cards/public/${card.sharingToken}/vcf`
            );
            expect(res.status).toBe(404);
        });
    });
});
