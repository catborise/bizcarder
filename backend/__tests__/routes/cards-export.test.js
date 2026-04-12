const supertest = require('supertest');
const app = require('../../server');
const { createTestUser, createTestCard, setupSuite, getAuthAgent } = require('../helpers');

const P = 'vcfexp'; // unique prefix for this suite

describe('Cards Export — Bulk VCF', () => {
    let user, agent;

    beforeAll(async () => {
        const ctx = await setupSuite(P);
        user = await createTestUser({ username: `${P}_user`, email: `${P}_user@test.com` });
        agent = await getAuthAgent(user);
    });

    // ─── GET /api/cards/export/vcf ────────────────────────────────────────────

    describe('GET /api/cards/export/vcf', () => {
        test('returns vcf file with all cards', async () => {
            await createTestCard(user.id, { firstName: `${P}_Alice`, lastName: 'Smith', email: `${P}_alice@test.com` });
            await createTestCard(user.id, { firstName: `${P}_Bob`, lastName: 'Jones', email: `${P}_bob@test.com` });
            await createTestCard(user.id, { firstName: `${P}_Carol`, lastName: 'Lee', email: `${P}_carol@test.com` });

            const res = await agent.get('/api/cards/export/vcf');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/text\/vcard/);
            expect(res.headers['content-disposition']).toMatch(/attachment/);

            const vcardBlocks = res.text.split('BEGIN:VCARD').filter(Boolean);
            // At least the 3 cards we just created
            expect(vcardBlocks.length).toBeGreaterThanOrEqual(3);
        });

        test('exports only selected cards when ids param is provided', async () => {
            const c1 = await createTestCard(user.id, {
                firstName: `${P}_Sel1`,
                lastName: 'One',
                email: `${P}_sel1@test.com`,
            });
            const c2 = await createTestCard(user.id, {
                firstName: `${P}_Sel2`,
                lastName: 'Two',
                email: `${P}_sel2@test.com`,
            });
            await createTestCard(user.id, { firstName: `${P}_Sel3`, lastName: 'Three', email: `${P}_sel3@test.com` });

            const res = await agent.get(`/api/cards/export/vcf?ids=${c1.id},${c2.id}`);
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/text\/vcard/);

            const vcardBlocks = res.text.split('BEGIN:VCARD').filter(Boolean);
            expect(vcardBlocks).toHaveLength(2);
        });

        test('returns 404 when no cards match', async () => {
            const res = await agent.get('/api/cards/export/vcf?ids=999998,999999');
            expect(res.status).toBe(404);
            expect(res.body.errorCode).toBeDefined();
        });

        test('requires authentication', async () => {
            const res = await supertest(app).get('/api/cards/export/vcf');
            expect(res.status).toBe(401);
        });
    });
});
