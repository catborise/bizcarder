const supertest = require('supertest');
const app = require('../../server');

const P = 'helm'; // unique prefix for this suite

describe('Helmet Security Headers', () => {
    // Use a public endpoint that does not require authentication
    const PUBLIC_PATH = '/';

    test('sets X-Content-Type-Options to nosniff', async () => {
        const res = await supertest(app).get(PUBLIC_PATH);
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('sets X-Frame-Options or CSP frame-ancestors for clickjacking protection', async () => {
        const res = await supertest(app).get(PUBLIC_PATH);
        const hasXFrameOptions = !!res.headers['x-frame-options'];
        const csp = res.headers['content-security-policy'] || '';
        const hasFrameAncestors = csp.includes('frame-ancestors');
        // At least one clickjacking protection mechanism must be present
        expect(hasXFrameOptions || hasFrameAncestors).toBe(true);
    });

    test('does not set X-Powered-By header (hides Express fingerprint)', async () => {
        const res = await supertest(app).get(PUBLIC_PATH);
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    test('sets Content-Security-Policy header', async () => {
        const res = await supertest(app).get(PUBLIC_PATH);
        const csp = res.headers['content-security-policy'];
        expect(csp).toBeDefined();
        expect(csp).toContain("default-src");
        expect(csp).toContain("script-src");
        expect(csp).toContain("style-src");
    });

    test('CSP includes self directive for default-src', async () => {
        const res = await supertest(app).get(PUBLIC_PATH);
        const csp = res.headers['content-security-policy'];
        expect(csp).toMatch(/default-src[^;]*'self'/);
    });

    test('sets Cross-Origin-Resource-Policy to cross-origin', async () => {
        const res = await supertest(app).get(PUBLIC_PATH);
        expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });
});
