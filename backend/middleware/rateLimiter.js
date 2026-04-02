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

// In test environment, use a passthrough middleware to avoid rate limiting interference
const isTest = process.env.NODE_ENV === 'test';
const passThrough = (_req, _res, next) => next();

/**
 * Shared violation handler — logs the event to AuditLog then returns 429.
 */
const violationHandler = (req, res, next, options) => {
    const { logAction } = require('../utils/logger');
    logAction({
        action: 'RATE_LIMIT_EXCEEDED',
        details: `Rate limit exceeded: ${options.message?.error || 'Unknown limiter'}. IP: ${req.ip}, Path: ${req.originalUrl}`,
        req
    }).catch(() => {});
    res.status(options.statusCode).json(options.message);
};

/**
 * General API limiter — 100 requests per minute
 */
const apiLimiter = isTest ? passThrough : rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store,
    message: { error: 'Too many requests. Please try again in a minute.' },
    handler: violationHandler,
});

/**
 * Auth limiter (brute-force protection) — 5 attempts per 15 minutes
 */
const authLimiter = isTest ? passThrough : rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store,
    message: { error: 'Login attempts limited for security. Please try again in 15 minutes.' },
    handler: violationHandler,
});

/**
 * AI OCR limiter (cost/abuse control) — 20 per hour
 */
const ocrLimiter = isTest ? passThrough : rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store,
    message: { error: 'Hourly AI analysis limit reached. Please try again later.' },
    handler: violationHandler,
});

module.exports = {
    apiLimiter,
    authLimiter,
    ocrLimiter
};
