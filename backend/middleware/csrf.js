const crypto = require('crypto');

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function csrfProtection(req, res, next) {
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') return next();

    // Always set/refresh the CSRF cookie
    if (!req.cookies[CSRF_COOKIE]) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie(CSRF_COOKIE, token, {
            httpOnly: false, // JS must read this
            sameSite: 'lax', // 'strict' blocks cookie on SAML callback redirects
            secure: process.env.SESSION_SECURE === 'true',
            path: '/',
        });
        // For this first request, set it on req too so validation can pass
        req.cookies[CSRF_COOKIE] = token;
    }

    // Safe methods don't need CSRF validation
    if (SAFE_METHODS.includes(req.method)) return next();

    // Auth endpoints exempt from CSRF:
    // - SAML callback: browser form-redirect from IdP, cannot carry CSRF token
    // - Local login: first POST before CSRF cookie is set in browser
    // - Register: same as login
    // - Logout: session destruction, no state change risk
    const authExempt = ['/auth/login/callback', '/auth/local/login', '/auth/register', '/auth/logout'];
    if (authExempt.some((p) => req.originalUrl.startsWith(p))) return next();

    // Validate: compare cookie with header
    const cookieToken = req.cookies[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];

    if (
        !cookieToken ||
        !headerToken ||
        cookieToken.length !== headerToken.length ||
        !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
    ) {
        return res.status(403).json({ error: 'CSRF token mismatch.' });
    }

    next();
}

module.exports = csrfProtection;
