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
            httpOnly: false,  // JS must read this
            sameSite: 'strict',
            secure: process.env.SESSION_SECURE === 'true',
            path: '/',
        });
        // For this first request, set it on req too so validation can pass
        req.cookies[CSRF_COOKIE] = token;
    }

    // Safe methods don't need CSRF validation
    if (SAFE_METHODS.includes(req.method)) return next();

    // Validate: compare cookie with header
    const cookieToken = req.cookies[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ error: 'CSRF token mismatch.' });
    }

    next();
}

module.exports = csrfProtection;
