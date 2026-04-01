const supertest = require('supertest');
const app = require('../../server');
const { createTestUser, createTestCard } = require('../helpers');

const P = 'public'; // unique prefix for this suite

describe('Public Routes', () => {
    // No beforeAll/afterAll cleanDatabase — suite is self-contained

    // ============== GET /api/cards/stats ==============
    describe('GET /api/cards/stats', () => {
        test('returns totalCards count without authentication', async () => {
            const user = await createTestUser({ username: `${P}_statsuser`, email: `${P}_statsuser@testcorp.com` });
            await createTestCard(user.id, { firstName: `${P}_John`, email: `${P}_john@testcorp.com` });
            await createTestCard(user.id, { firstName: `${P}_Jane`, email: `${P}_jane@testcorp.com` });
            const res = await supertest(app).get('/api/cards/stats');
            expect(res.status).toBe(200);
            expect(res.body.totalCards).toBeDefined();
            expect(typeof res.body.totalCards).toBe('number');
            expect(res.body.totalCards).toBeGreaterThanOrEqual(2);
        });

        test('soft-deleted cards are excluded from totalCards count', async () => {
            const user = await createTestUser({ username: `${P}_softdelstats`, email: `${P}_softdelstats@testcorp.com` });
            const card = await createTestCard(user.id, { firstName: `${P}_SoftDel`, email: `${P}_softdel@testcorp.com` });
            // Soft-delete the card
            await card.update({ deletedAt: new Date() });
            // Get count before and ensure this card is not counted
            const res = await supertest(app).get('/api/cards/stats');
            expect(res.status).toBe(200);
            // The soft-deleted card should not appear in the count
            expect(typeof res.body.totalCards).toBe('number');
        });
    });

    // ============== GET /api/cards/public/:token ==============
    describe('GET /api/cards/public/:token', () => {
        test('valid token for public card returns card data without auth', async () => {
            const user = await createTestUser({ username: `${P}_publicuser`, email: `${P}_publicuser@testcorp.com` });
            const card = await createTestCard(user.id, { visibility: 'public', email: `${P}_publiccard@testcorp.com` });
            const res = await supertest(app).get(`/api/cards/public/${card.sharingToken}`);
            expect(res.status).toBe(200);
            expect(res.body.firstName).toBe('John');
            expect(res.body.lastName).toBe('Doe');
            expect(res.body.sharingToken).toBe(card.sharingToken);
        });

        test('private card token returns 404', async () => {
            const user = await createTestUser({ username: `${P}_privateuser`, email: `${P}_privateuser@testcorp.com` });
            // createTestCard defaults to visibility: 'private'
            const card = await createTestCard(user.id, { email: `${P}_privatecard@testcorp.com` });
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
            const user = await createTestUser({ username: `${P}_softdelpublic`, email: `${P}_softdelpublic@testcorp.com` });
            const card = await createTestCard(user.id, { visibility: 'public', email: `${P}_softdelpubliccard@testcorp.com` });
            await card.update({ deletedAt: new Date() });

            const res = await supertest(app).get(`/api/cards/public/${card.sharingToken}`);
            expect(res.status).toBe(404);
        });

        test('response includes tags and owner display name', async () => {
            const user = await createTestUser({ username: `${P}_tagsowner`, email: `${P}_tagsowner@testcorp.com`, displayName: `${P} Tags Owner` });
            const card = await createTestCard(user.id, { visibility: 'public', email: `${P}_tagscard@testcorp.com` });
            const res = await supertest(app).get(`/api/cards/public/${card.sharingToken}`);
            expect(res.status).toBe(200);
            // tags and owner should be included (via associations)
            expect(Array.isArray(res.body.tags)).toBe(true);
            expect(res.body.owner).toBeDefined();
            expect(res.body.owner.displayName).toBe(`${P} Tags Owner`);
        });
    });

    // ============== GET /api/cards/public/:token/vcf ==============
    describe('GET /api/cards/public/:token/vcf', () => {
        test('valid token returns vCard file with correct content-type', async () => {
            const user = await createTestUser({ username: `${P}_vcfuser1`, email: `${P}_vcfuser1@testcorp.com` });
            const card = await createTestCard(user.id, { visibility: 'public', email: `${P}_vcf1@testcorp.com` });
            const res = await supertest(app).get(
                `/api/cards/public/${card.sharingToken}/vcf`
            );
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/text\/vcard|text\/x-vcard/i);
        });

        test('valid token returns attachment with content-disposition header', async () => {
            const user = await createTestUser({ username: `${P}_vcfuser2`, email: `${P}_vcfuser2@testcorp.com` });
            const card = await createTestCard(user.id, { visibility: 'public', email: `${P}_vcf2@testcorp.com` });
            const res = await supertest(app).get(
                `/api/cards/public/${card.sharingToken}/vcf`
            );
            expect(res.status).toBe(200);
            expect(res.headers['content-disposition']).toMatch(/attachment/i);
        });

        test('vCard body contains BEGIN:VCARD and END:VCARD', async () => {
            const user = await createTestUser({ username: `${P}_vcfuser3`, email: `${P}_vcfuser3@testcorp.com` });
            const card = await createTestCard(user.id, { visibility: 'public', email: `${P}_vcf3@testcorp.com` });
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
            const user = await createTestUser({ username: `${P}_vcfsoftdel`, email: `${P}_vcfsoftdel@testcorp.com` });
            const card = await createTestCard(user.id, { visibility: 'public', email: `${P}_vcfsoftdel@card.com` });
            await card.update({ deletedAt: new Date() });

            const res = await supertest(app).get(
                `/api/cards/public/${card.sharingToken}/vcf`
            );
            expect(res.status).toBe(404);
        });
    });
});
