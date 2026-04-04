// Ensure tests use a separate database to avoid destroying production data.
// Override DB_NAME before any module reads the config.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'crm_db_test';

const { Sequelize } = require('sequelize');

module.exports = async () => {
    const dbName = process.env.DB_NAME;
    const dbUser = process.env.DB_USER || 'crm_user';
    const dbPass = process.env.DB_PASSWORD || 'crm_password';
    const dbHost = process.env.DB_HOST || 'localhost';

    // Connect without a specific DB to create the test database if it doesn't exist
    const rootSeq = new Sequelize('postgres', dbUser, dbPass, {
        host: dbHost, dialect: 'postgres', logging: false,
    });

    try {
        await rootSeq.query(`CREATE DATABASE "${dbName}"`);
        console.log(`Test DB "${dbName}" created.`);
    } catch (err) {
        // Already exists — fine
        if (err.original?.code !== '42P04') {
            console.warn(`Could not create test DB: ${err.message}`);
        }
    } finally {
        await rootSeq.close();
    }

    // Now load models with the test DB name and sync
    const sequelize = require('../config/database');
    const { connectDatabase } = require('../models');

    await connectDatabase();
    await sequelize.sync({ force: true });
    console.log(`Test DB "${dbName}" synced.`);
};
