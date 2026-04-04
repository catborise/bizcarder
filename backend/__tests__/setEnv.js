// This file runs in each test worker before any modules are loaded.
// Setting NODE_ENV here ensures rate limiters and other env-sensitive
// middleware are initialized in test mode.
process.env.NODE_ENV = 'test';
// Use a separate database for tests so production data is never touched.
process.env.DB_NAME = process.env.DB_NAME_TEST || 'crm_db_test';
