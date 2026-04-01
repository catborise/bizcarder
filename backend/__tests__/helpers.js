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
    await agent
        .post('/auth/local/login')
        .send({ username: user.username, password: 'Test1234!' })
        .expect(200);
    return agent;
}

async function cleanDatabase() {
    const sequelize = require('../config/database');
    // Truncate all tables in correct order (respecting FK constraints)
    const tables = ['BusinessCardTags', 'BusinessCardHistories', 'Interactions', 'BusinessCards', 'Tags', 'AuditLogs', 'DashboardTiles', 'SystemSettings', 'Users'];
    for (const table of tables) {
        try {
            await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        } catch (e) {
            // Table might not exist yet, skip
        }
    }
    // Also truncate Sessions if it exists
    try {
        await sequelize.query('TRUNCATE TABLE "Sessions" RESTART IDENTITY CASCADE');
    } catch (e) {}
}

module.exports = { createTestUser, createTestAdmin, createTestCard, createTestTag, getAuthAgent, cleanDatabase };
