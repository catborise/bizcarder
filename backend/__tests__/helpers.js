const supertest = require('supertest');
const app = require('../server');
const { User, BusinessCard, Tag } = require('../models');

async function createTestUser(overrides = {}) {
    const defaults = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test1234!',
        displayName: 'Test User',
        role: 'user',
        isApproved: true,
    };
    return User.create({ ...defaults, ...overrides });
}

async function createTestAdmin(overrides = {}) {
    return createTestUser({
        username: 'adminuser',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'admin',
        ...overrides,
    });
}

async function createTestCard(ownerId, overrides = {}) {
    const defaults = {
        firstName: 'John',
        lastName: 'Doe',
        company: 'TestCorp',
        title: 'Engineer',
        email: 'john@testcorp.com',
        phone: '+905551234567',
        ownerId,
        visibility: 'private',
    };
    return BusinessCard.create({ ...defaults, ...overrides });
}

async function createTestTag(ownerId, overrides = {}) {
    return Tag.create({ name: 'TestTag', color: '#ff0000', ownerId, ...overrides });
}

async function getAuthAgent(user) {
    const agent = supertest.agent(app);

    // Local login only allows admin users. For test users with role='user',
    // temporarily promote to admin to authenticate, then revert the role.
    // Passport serializes only the user ID; on subsequent requests it
    // deserializes from the DB, so the reverted role takes effect immediately.
    const originalRole = user.role;
    if (user.role !== 'admin') {
        await user.update({ role: 'admin' });
    }

    await agent
        .post('/auth/local/login')
        .send({ username: user.username, password: 'Test1234!' })
        .expect(200);

    if (originalRole !== 'admin') {
        await user.update({ role: originalRole });
    }

    return agent;
}

async function cleanDatabase() {
    const sequelize = require('../config/database');
    await sequelize.query(`
        TRUNCATE TABLE "BusinessCardTags", "BusinessCardHistories", "Interactions",
        "BusinessCards", "Tags", "AuditLogs", "DashboardTiles", "SystemSettings", "Users"
        RESTART IDENTITY CASCADE
    `).catch(() => {});
    try { await sequelize.query('TRUNCATE TABLE "Sessions" RESTART IDENTITY CASCADE'); } catch(e) {}
}

module.exports = { createTestUser, createTestAdmin, createTestCard, createTestTag, getAuthAgent, cleanDatabase };
