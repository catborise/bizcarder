// This file runs in each test worker before any modules are loaded.
// Setting NODE_ENV here ensures rate limiters and other env-sensitive
// middleware are initialized in test mode.
process.env.NODE_ENV = 'test';
