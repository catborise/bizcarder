const supertest = require('supertest');
const ExcelJS = require('exceljs');
const app = require('../../server');
const { BusinessCard } = require('../../models');
const { setupSuite } = require('../helpers');

const P = 'cimp';

describe('Cards Bulk Import & Template Routes', () => {
    let admin, agent;

    beforeAll(async () => {
        ({ admin, agent } = await setupSuite(P));
    });

    describe('GET /api/cards/import/template', () => {
        test('rejects unauthenticated requests with 401', async () => {
            const res = await supertest(app).get('/api/cards/import/template');
            expect(res.status).toBe(401);
        });

        test('downloads XLSX template by default', async () => {
            const res = await agent.get('/api/cards/import/template');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            expect(res.headers['content-disposition']).toContain('kartvizit_sablon.xlsx');
        });

        test('downloads UTF-8 BOM CSV template when format=csv', async () => {
            const res = await agent.get('/api/cards/import/template?format=csv');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.headers['content-disposition']).toContain('kartvizit_sablon.csv');
            expect(res.text).toContain('Ad*,Soyad*');
        });
    });

    describe('POST /api/cards/import/bulk', () => {
        test('rejects unauthenticated requests with 401', async () => {
            const res = await supertest(app)
                .post('/api/cards/import/bulk')
                .attach('file', Buffer.from('Ad*,Soyad*\nAli,Veli'), 'cards.csv');
            expect(res.status).toBe(401);
        });

        test('returns 400 when no file is uploaded', async () => {
            const res = await agent.post('/api/cards/import/bulk');
            expect(res.status).toBe(400);
        });

        test('imports valid CSV rows and reports invalid rows without failing the batch', async () => {
            const csvContent =
                '\uFEFFAd*,Soyad*,Şirket,Ünvan,E-Posta,Telefon,Adres,Şehir,Ülke,Web Sitesi,Notlar\n' +
                `ali,yilmaz,"Acme, Inc.",CTO,ali.${P}@example.com,+905551112233,"Ataturk Cad, No:1",istanbul,turkiye,https://acme.test,VIP\n` +
                `,MissingFirst,Corp,Dev,valid@example.com,,,,,,\n` +
                'Bad,Email,Corp,Dev,not-an-email,,,,,,\n';

            const res = await agent
                .post('/api/cards/import/bulk')
                .attach('file', Buffer.from(csvContent, 'utf8'), `${P}_cards.csv`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.importedCount).toBe(1);
            expect(res.body.errorCount).toBe(2);
            expect(res.body.errors).toHaveLength(2);

            const saved = await BusinessCard.findOne({ where: { email: `ali.${P}@example.com` } });
            expect(saved).not.toBeNull();
            expect(saved.firstName).toBe('Ali');
            expect(saved.lastName).toBe('YILMAZ');
            expect(saved.company).toBe('Acme, Inc.');
            expect(saved.city).toBe('ISTANBUL');
            expect(saved.ownerId).toBe(admin.id);
        });

        test('imports vCard (.vcf) file including ADR street, city, and country', async () => {
            const vcfContent = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                'N:Kaya;Elif;;;',
                'FN:Elif Kaya',
                'ORG:TechLabs',
                'TITLE:Architect',
                `EMAIL:elif.${P}@techlabs.test`,
                'TEL:+905321234567',
                'ADR;TYPE=WORK:;;Istiklal Cad 10;Istanbul;;34000;Turkey',
                'URL:https://techlabs.test',
                'NOTE:Met at conference',
                'END:VCARD',
            ].join('\r\n');

            const res = await agent
                .post('/api/cards/import/bulk')
                .attach('file', Buffer.from(vcfContent, 'utf8'), `${P}_contacts.vcf`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.importedCount).toBe(1);
            expect(res.body.errorCount).toBe(0);

            const saved = await BusinessCard.findOne({ where: { email: `elif.${P}@techlabs.test` } });
            expect(saved).not.toBeNull();
            expect(saved.firstName).toBe('Elif');
            expect(saved.lastName).toBe('KAYA');
            expect(saved.address).toBe('Istiklal Cad 10');
            expect(saved.city).toBe('ISTANBUL');
            expect(saved.country).toBe('TURKEY');
        });

        test('imports Excel (.xlsx) workbook rows', async () => {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Cards');
            sheet.addRow(['Ad*', 'Soyad*', 'Şirket', 'Ünvan', 'E-Posta']);
            sheet.addRow(['Deniz', 'Arslan', 'CloudCo', 'Lead', `deniz.${P}@cloudco.test`]);
            const xlsxBuffer = await workbook.xlsx.writeBuffer();

            const res = await agent
                .post('/api/cards/import/bulk')
                .attach('file', Buffer.from(xlsxBuffer), `${P}_cards.xlsx`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.importedCount).toBe(1);

            const saved = await BusinessCard.findOne({ where: { email: `deniz.${P}@cloudco.test` } });
            expect(saved).not.toBeNull();
            expect(saved.company).toBe('CloudCo');
        });

        test('rejects unsupported file extensions (e.g. .html / .jpg)', async () => {
            const res = await agent
                .post('/api/cards/import/bulk')
                .attach('file', Buffer.from('<html><script>alert(1)</script></html>'), 'evil.html');

            expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });
});
