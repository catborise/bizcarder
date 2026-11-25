const supertest = require('supertest');
const app = require('../../server');
const { createTestUser, createTestCard, createTestTag, getAuthAgent } = require('../helpers');
const { AgendaShare } = require('../../models');

describe('Executive Assistant Agenda, Delegation & Share Security Matrix', () => {
    let secA;
    let secB;
    let secC;
    let agentA;
    let agentB;
    let agentC;
    let cardAhmet;
    let foreignTagC;

    beforeAll(async () => {
        secA = await createTestUser({
            username: 'agenda_sec_a',
            email: 'agenda_sec_a@test.com',
            displayName: 'Ayşe Sekreter (Asıl)',
            role: 'user',
        });
        secB = await createTestUser({
            username: 'agenda_sec_b',
            email: 'agenda_sec_b@test.com',
            displayName: 'Burcu Sekreter (Vekil)',
            role: 'user',
        });
        secC = await createTestUser({
            username: 'agenda_sec_c',
            email: 'agenda_sec_c@test.com',
            displayName: 'Canan Sekreter (Yetkisiz)',
            role: 'user',
        });

        agentA = await getAuthAgent(secA);
        agentB = await getAuthAgent(secB);
        agentC = await getAuthAgent(secC);

        cardAhmet = await createTestCard(secA.id, {
            firstName: 'Ahmet',
            lastName: 'Yılmaz',
            company: 'Yılmaz Holding',
            phone: '+905559998877',
            email: 'ahmet.secret@yilmaz.com',
            visibility: 'public',
        });

        await createTestTag(secA.id, {
            name: 'finans',
            color: '#10b981',
        });

        foreignTagC = await createTestTag(secC.id, {
            name: 'canan_ozel_etiket',
            color: '#ef4444',
        });
    });

    describe('1. Daily Page, Inline Smart Syntax, Optimistic Concurrency & Contact Snapshot', () => {
        let publicEntryId;
        let privateEntryId;

        test('parses inline timeSlot, strips leading time from cleanContent, links @Contact and blocks foreign tagIds (Tag IDOR)', async () => {
            const res = await agentA
                .post('/api/agenda/entries')
                .send({
                    date: '2026-11-24',
                    content: '14:30 @Ahmet Yılmaz ile bütçe revizyonu #finans !yarın 10:00',
                    contactIds: [cardAhmet.id],
                    tagIds: [foreignTagC.id], // Must be ignored (owned by secC)
                })
                .expect(201);

            expect(res.body.timeSlot).toBe('14:30');
            expect(res.body.content).toBe('@Ahmet Yılmaz ile bütçe revizyonu #finans !yarın 10:00');
            expect(res.body.entryType).toBe('schedule');
            expect(res.body.reminderAt).toBeTruthy();
            expect(res.body.contactLinks).toHaveLength(1);
            expect(res.body.contactLinks[0].displayNameSnapshot).toBe('Ahmet Yılmaz');
            expect(res.body.tags.map((t) => t.name)).toContain('finans');
            expect(res.body.tags.map((t) => t.name)).not.toContain('canan_ozel_etiket');
            publicEntryId = res.body.id;
        });

        test('creates an owner-only private entry (🔒 Özel)', async () => {
            const res = await agentA
                .post('/api/agenda/entries')
                .send({
                    date: '2026-11-24',
                    content: 'Yönetici özel maaş/prim notu',
                    isPrivate: true,
                })
                .expect(201);

            expect(res.body.isPrivate).toBe(true);
            privateEntryId = res.body.id;
        });

        test('updates freeformNotes & privateNotes and enforces version optimistic concurrency (409)', async () => {
            const put1 = await agentA
                .put('/api/agenda/day/2026-11-24/notes')
                .send({
                    freeformNotes: 'Genel sağ sayfa notları',
                    privateNotes: 'Gizli sağ sayfa karalaması',
                })
                .expect(200);

            expect(put1.body.page.version).toBe(1);
            expect(put1.body.page.privateNotes).toBe('Gizli sağ sayfa karalaması');

            const put2 = await agentA
                .put('/api/agenda/day/2026-11-24/notes')
                .send({
                    freeformNotes: 'Güncellenmiş sağ sayfa notları',
                    version: 1,
                })
                .expect(200);

            expect(put2.body.page.version).toBe(2);

            // Stale version 1 must fail with 409
            const conflict = await agentA
                .put('/api/agenda/day/2026-11-24/notes')
                .send({
                    freeformNotes: 'Eski versiyonla ezme denemesi',
                    version: 1,
                })
                .expect(409);

            expect(conflict.body.errorCode).toBe('AGENDA_VERSION_CONFLICT');
        });

        test('KVKK Guard: User C viewing public cardAhmet cannot see Secretary A agenda entries', async () => {
            const ownerHist = await agentA.get(`/api/agenda/contact/${cardAhmet.id}`).expect(200);
            expect(ownerHist.body.entries).toHaveLength(1);

            const strangerHist = await agentC.get(`/api/agenda/contact/${cardAhmet.id}`).expect(200);
            expect(strangerHist.body.entries).toHaveLength(0);
        });

        test('preserves displayNameSnapshot even if linked BusinessCard is permanently deleted', async () => {
            const tempCard = await createTestCard(secA.id, {
                firstName: 'Silinecek',
                lastName: 'Misafir',
            });

            const entryRes = await agentA
                .post('/api/agenda/entries')
                .send({
                    date: '2026-11-24',
                    content: '[] @Silinecek Misafir evrak teslimi',
                    contactIds: [tempCard.id],
                })
                .expect(201);

            expect(entryRes.body.entryType).toBe('task');
            expect(entryRes.body.content).toBe('@Silinecek Misafir evrak teslimi');
            await tempCard.destroy();

            const dayRes = await agentA.get('/api/agenda/day/2026-11-24').expect(200);
            const found = dayRes.body.entries.find((e) => e.id === entryRes.body.id);
            expect(found.contactLinks[0].displayNameSnapshot).toBe('Silinecek Misafir');
            expect(found.contactLinks[0].cardId).toBeNull();
        });

        test('idempotent roll-over (migrate-unfinished) moves open entries once without duplicating and rejects past dates', async () => {
            await agentA
                .post('/api/agenda/entries/migrate-unfinished')
                .send({ fromDate: '2026-11-24', toDate: '2026-11-20' })
                .expect(400);

            // Mark publicEntryId as done so only open task rolls over
            await agentA.patch(`/api/agenda/entries/${publicEntryId}`).send({ status: 'done' }).expect(200);

            const mig1 = await agentA
                .post('/api/agenda/entries/migrate-unfinished')
                .send({ fromDate: '2026-11-24', toDate: '2026-11-25' })
                .expect(200);

            expect(mig1.body.migratedCount).toBe(2); // tempCard task + privateEntry

            // Repeating the same migration is idempotent (0 new clones)
            const mig2 = await agentA
                .post('/api/agenda/entries/migrate-unfinished')
                .send({ fromDate: '2026-11-24', toDate: '2026-11-25' })
                .expect(200);

            expect(mig2.body.migratedCount).toBe(0);

            // Re-open publicEntryId for subsequent delegation tests
            await agentA.patch(`/api/agenda/entries/${publicEntryId}`).send({ status: 'open' }).expect(200);
            await agentA.patch(`/api/agenda/entries/${privateEntryId}`).send({ status: 'open' }).expect(200);
        });
    });

    describe('2. Substitute Secretary (Vekâlet) & Role × Action Permission Matrix', () => {
        let delegationId;
        let ownerPublicEntryId;
        let ownerPrivateEntryId;
        let substituteEntryId;

        beforeAll(async () => {
            const dayRes = await agentA.get('/api/agenda/day/2026-11-24').expect(200);
            ownerPublicEntryId = dayRes.body.entries.find((e) => !e.isPrivate && e.status === 'open').id;
            ownerPrivateEntryId = dayRes.body.entries.find((e) => e.isPrivate).id;
        });

        test('denies access before delegation is created (403 AGENDA_ACCESS_DENIED)', async () => {
            await agentB.get('/api/agenda/day/2026-11-24').set('X-Agenda-Owner-Id', String(secA.id)).expect(403);
        });

        test('Secretary A creates active delegation for Secretary B', async () => {
            const startsAt = new Date(Date.now() - 60 * 1000).toISOString();
            const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            const res = await agentA
                .post('/api/agenda/delegations')
                .send({
                    delegateUserId: secB.id,
                    permission: 'write',
                    startsAt,
                    endsAt,
                    note: 'Yıllık izin vekâleti - acil konular',
                })
                .expect(201);

            delegationId = res.body.id;
            expect(res.body.delegateUserId).toBe(secB.id);
        });

        test('Substitute B sees non-private entries & freeformNotes, but NEVER privateNotes or isPrivate entries', async () => {
            const res = await agentB
                .get('/api/agenda/day/2026-11-24')
                .set('X-Agenda-Owner-Id', String(secA.id))
                .expect(200);

            expect(res.body.access.isDelegate).toBe(true);
            expect(res.body.access.handoverNote).toBe('Yıllık izin vekâleti - acil konular');
            expect(res.body.page.freeformNotes).toBe('Güncellenmiş sağ sayfa notları');
            expect(res.body.page.privateNotes).toBeUndefined();
            expect(res.body.entries.some((e) => e.isPrivate)).toBe(false);
        });

        test('Substitute B probing owner isPrivate entry by ID gets 404 (prevents IDOR)', async () => {
            await agentB
                .patch(`/api/agenda/entries/${ownerPrivateEntryId}`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({ status: 'done' })
                .expect(404);

            await agentB
                .delete(`/api/agenda/entries/${ownerPrivateEntryId}`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .expect(404);
        });

        test('Substitute B rolling over owner entry cannot gain authorship to edit or delete the rolled-over clone (K3 fix)', async () => {
            await agentB
                .post('/api/agenda/entries/migrate-unfinished')
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({ fromDate: '2026-11-24', toDate: '2026-11-26' })
                .expect(200);

            const day26 = await agentB
                .get('/api/agenda/day/2026-11-26')
                .set('X-Agenda-Owner-Id', String(secA.id))
                .expect(200);

            const rolledOverClone = day26.body.entries.find((e) => e.migratedFromEntryId === ownerPublicEntryId);
            expect(rolledOverClone).toBeDefined();
            expect(rolledOverClone.createdBy.id).toBe(secA.id);

            // Substitute B still cannot edit text or delete the rolled-over entry owned/authored by A
            await agentB
                .patch(`/api/agenda/entries/${rolledOverClone.id}`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({ content: 'Devredilen kaydı değiştirme denemesi' })
                .expect(403);

            await agentB
                .delete(`/api/agenda/entries/${rolledOverClone.id}`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .expect(403);
        });

        test('Substitute B can update status of owner entry, but CANNOT edit owner entry text or delete it (403)', async () => {
            const statusUpdate = await agentB
                .patch(`/api/agenda/entries/${ownerPublicEntryId}`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({ status: 'done' })
                .expect(200);

            expect(statusUpdate.body.status).toBe('done');
            expect(statusUpdate.body.updatedBy.id).toBe(secB.id);

            await agentB
                .patch(`/api/agenda/entries/${ownerPublicEntryId}`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({ content: 'Asıl sekreterin yazısını değiştirme denemesi' })
                .expect(403);

            await agentB
                .delete(`/api/agenda/entries/${ownerPublicEntryId}`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .expect(403);
        });

        test('Substitute B can create entry (tracked with createdByUserId), edit its own entry, and soft-delete it (but not permanent delete)', async () => {
            await agentB
                .post('/api/agenda/entries')
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({
                    date: '2026-11-24',
                    content: 'Gizli oluşturma denemesi',
                    isPrivate: true,
                })
                .expect(403);

            const createRes = await agentB
                .post('/api/agenda/entries')
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({
                    date: '2026-11-24',
                    content: '16:00 Vekil tarafından alınan telefon notu',
                })
                .expect(201);

            substituteEntryId = createRes.body.id;
            expect(createRes.body.ownerId).toBe(secA.id);
            expect(createRes.body.createdBy.id).toBe(secB.id);

            await agentB
                .patch(`/api/agenda/entries/${substituteEntryId}`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({ content: 'Vekil telefon notu (düzeltildi)' })
                .expect(200);

            await agentB
                .delete(`/api/agenda/entries/${substituteEntryId}?permanent=true`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .expect(403);

            await agentB
                .delete(`/api/agenda/entries/${substituteEntryId}`)
                .set('X-Agenda-Owner-Id', String(secA.id))
                .expect(200);
        });

        test('Substitute B CANNOT edit privateNotes, create external share links, or sub-delegate (403)', async () => {
            await agentB
                .put('/api/agenda/day/2026-11-24/notes')
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({ privateNotes: 'Sızma denemesi' })
                .expect(403);

            await agentB
                .post('/api/agenda/shares')
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({ startDate: '2026-11-24' })
                .expect(403);

            await agentB
                .post('/api/agenda/delegations')
                .set('X-Agenda-Owner-Id', String(secA.id))
                .send({
                    delegateUserId: secC.id,
                    startsAt: new Date().toISOString(),
                    endsAt: new Date(Date.now() + 3600000).toISOString(),
                })
                .expect(403);
        });

        test('revoking delegation immediately cuts off Substitute B access', async () => {
            await agentA.delete(`/api/agenda/delegations/${delegationId}`).expect(200);

            await agentB.get('/api/agenda/day/2026-11-24').set('X-Agenda-Owner-Id', String(secA.id)).expect(403);
        });
    });

    describe('3. Selective Page Sharing (/api/public/agenda/:token) & PII/Hash/Recipient Protection', () => {
        let shareId;
        let rawToken;

        test('Owner creates share link; DB stores SHA-256 hash instead of plaintext token', async () => {
            const res = await agentA
                .post('/api/agenda/shares')
                .send({
                    startDate: '2026-11-24',
                    endDate: '2026-11-24',
                    title: '24 Kasım Yönetici Bilgi Notu',
                })
                .expect(201);

            shareId = res.body.share.id;
            rawToken = res.body.rawToken;
            expect(rawToken).toMatch(/^[0-9a-f]{64}$/i);

            const dbRow = await AgendaShare.findByPk(shareId);
            expect(dbRow.shareTokenHash).not.toBe(rawToken);
            expect(dbRow.shareTokenHash).toHaveLength(64);
        });

        test('Public viewer sees shared page without auth (with Cache-Control: no-store), while privateNotes, isPrivate entries, and contact phone/email are stripped', async () => {
            const pubRes = await supertest(app).get(`/api/public/agenda/${rawToken}`).expect(200);

            expect(pubRes.headers['cache-control']).toBe('no-store');
            expect(pubRes.headers['referrer-policy']).toBe('no-referrer');
            expect(pubRes.body.share.title).toBe('24 Kasım Yönetici Bilgi Notu');
            expect(pubRes.body.pages[0].freeformNotes).toBe('Güncellenmiş sağ sayfa notları');
            expect(pubRes.body.pages[0].privateNotes).toBeUndefined();

            expect(pubRes.body.entries.some((e) => e.content.includes('maaş/prim'))).toBe(false);

            const entryWithContact = pubRes.body.entries.find((e) => e.contactLinks && e.contactLinks.length > 0);
            expect(entryWithContact.contactLinks[0].displayNameSnapshot).toBe('Ahmet Yılmaz');
            expect(entryWithContact.contactLinks[0].card).toBeUndefined();
        });

        test('Recipient-scoped share (sharedWithUserId) denies anonymous and unauthorized users (404), allows only recipient and owner', async () => {
            const scopedRes = await agentA
                .post('/api/agenda/shares')
                .send({
                    startDate: '2026-11-24',
                    endDate: '2026-11-24',
                    title: 'Sadece Burcu İçin Paylaşım',
                    sharedWithUserId: secB.id,
                })
                .expect(201);

            const scopedToken = scopedRes.body.rawToken;

            // Anonymous viewer denied with 404
            await supertest(app).get(`/api/public/agenda/${scopedToken}`).expect(404);
            // Unauthorized user C denied with 404
            await agentC.get(`/api/public/agenda/${scopedToken}`).expect(404);
            // Designated recipient B allowed
            await agentB.get(`/api/public/agenda/${scopedToken}`).expect(200);
        });

        test('Revoked or malformed tokens return uniform 404 AGENDA_SHARE_NOT_FOUND', async () => {
            await supertest(app).get('/api/public/agenda/invalid-token').expect(404);

            await agentA.delete(`/api/agenda/shares/${shareId}`).expect(200);

            const revokedRes = await supertest(app).get(`/api/public/agenda/${rawToken}`).expect(404);
            expect(revokedRes.body.errorCode).toBe('AGENDA_SHARE_NOT_FOUND');
        });
    });

    describe('4. Yearly Overview & Search', () => {
        test('returns 12-month SQL-aggregated summary and searches entries without leaking private items to non-owners', async () => {
            const yearRes = await agentA.get('/api/agenda/year-overview/2026').expect(200);
            expect(yearRes.body.months).toHaveLength(12);
            expect(yearRes.body.days['2026-11-24']).toBeDefined();
            expect(yearRes.body.days['2026-11-24'].hasNotes).toBe(true);

            const searchRes = await agentA.get('/api/agenda/search?q=bütçe').expect(200);
            expect(searchRes.body.entries.length).toBeGreaterThanOrEqual(1);
        });
    });
});
