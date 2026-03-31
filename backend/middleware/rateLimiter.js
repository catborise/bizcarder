const rateLimit = require('express-rate-limit');

// Use Redis store for multi-instance deployments
// Set REDIS_URL env var to enable (e.g. redis://redis:6379)
let store = undefined; // defaults to in-memory
if (process.env.REDIS_URL) {
    try {
        const { RedisStore } = require('rate-limit-redis');
        const { createClient } = require('redis');
        const client = createClient({ url: process.env.REDIS_URL });
        client.connect().catch(err => console.error('[RATE-LIMIT] Redis connection failed, falling back to in-memory:', err.message));
        store = new RedisStore({ sendCommand: (...args) => client.sendCommand(args) });
        console.log('[RATE-LIMIT] Using Redis store for distributed rate limiting.');
    } catch (err) {
        console.warn('[RATE-LIMIT] Redis packages not installed. Using in-memory store (not suitable for multi-instance).');
    }
}

/**
 * General API limiter — 100 requests per minute
 */
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store,
    message: { error: 'Too many requests. Please try again in a minute.' }
});

/**
 * Auth limiter (brute-force protection) — 5 attempts per 15 minutes
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store,
    message: { error: 'Login attempts limited for security. Please try again in 15 minutes.' }
});

/**
 * AI OCR limiter (cost/abuse control) — 20 per hour
 */
const ocrLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store,
    message: { error: 'Hourly AI analysis limit reached. Please try again later.' }
});

module.exports = {
    apiLimiter,
    authLimiter,
    ocrLimiter
};
