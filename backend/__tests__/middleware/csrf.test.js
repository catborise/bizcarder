const csrfProtection = require('../../middleware/csrf');

function createMockReqRes(overrides = {}) {
    const req = {
        method: 'POST',
        originalUrl: '/api/cards',
        cookies: {},
        headers: {},
        ...overrides,
    };
    const res = {
        statusCode: 200,
        body: null,
        cookiesSet: {},
        cookie: jest.fn((name, val, opts) => {
            res.cookiesSet[name] = { val, opts };
        }),
        status: jest.fn((code) => {
            res.statusCode = code;
            return res;
        }),
        json: jest.fn((payload) => {
            res.body = payload;
            return res;
        }),
    };
    const next = jest.fn();
    return { req, res, next };
}

describe('csrfProtection middleware', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    test('skips validation in test environment', () => {
        process.env.NODE_ENV = 'test';
        const { req, res, next } = createMockReqRes();
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('sets csrf-token cookie and allows safe HTTP methods', () => {
        const { req, res, next } = createMockReqRes({ method: 'GET' });
        csrfProtection(req, res, next);
        expect(res.cookie).toHaveBeenCalledWith(
            'csrf-token',
            expect.any(String),
            expect.objectContaining({ httpOnly: false, sameSite: 'lax' }),
        );
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('exempts auth endpoints including /auth/local/register', () => {
        for (const url of ['/auth/local/login', '/auth/local/register', '/auth/login/callback', '/auth/logout']) {
            const { req, res, next } = createMockReqRes({ method: 'POST', originalUrl: url });
            csrfProtection(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
        }
    });

    test('rejects state-changing request with missing CSRF header', () => {
        const { req, res, next } = createMockReqRes({
            method: 'POST',
            cookies: { 'csrf-token': 'a'.repeat(64) },
        });
        csrfProtection(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.body).toMatchObject({ errorCode: 'CSRF_TOKEN_MISMATCH' });
    });

    test('rejects mismatched token and handles multi-byte UTF-8 header without throwing RangeError', () => {
        // Same character length (64 chars) but different UTF-8 byte length
        const cookieToken = 'a'.repeat(64);
        const multiByteHeader = 'ğ'.repeat(64);
        const { req, res, next } = createMockReqRes({
            method: 'DELETE',
            cookies: { 'csrf-token': cookieToken },
            headers: { 'x-csrf-token': multiByteHeader },
        });
        expect(() => csrfProtection(req, res, next)).not.toThrow();
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.body).toMatchObject({ errorCode: 'CSRF_TOKEN_MISMATCH' });
    });

    test('allows state-changing request when cookie and header tokens match', () => {
        const token = 'f'.repeat(64);
        const { req, res, next } = createMockReqRes({
            method: 'PUT',
            cookies: { 'csrf-token': token },
            headers: { 'x-csrf-token': token },
        });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});
