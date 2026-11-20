#!/usr/bin/env node
/**
 * Seeds the database with default admin user and dashboard tiles.
 * Safe to run multiple times — skips if data already exists.
 *
 * Usage: node scripts/seed.js
 * Or:    docker exec crm_backend node scripts/seed.js
 */

const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { User, DashboardTile, sequelize } = require('../models');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('DB connected.');

        // Read admin password from env or generate a strong one-time password
        const envPassword = process.env.ADMIN_DEFAULT_PASSWORD;
        const generatedPassword = !envPassword ? crypto.randomBytes(12).toString('base64url') : null;
        const adminPassword = envPassword || generatedPassword;

        // Seed admin user
        const [, adminCreated] = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@bizcarder.local',
                password: adminPassword,
                displayName: 'Admin',
                role: 'admin',
                isApproved: true,
            },
        });
        if (adminCreated) {
            console.log('Admin user created.');
            if (generatedPassword) {
                console.log(`[SEED] Generated one-time admin password: ${generatedPassword}`);
                console.log('[SEED] Please change this password immediately after first login.');
            }
        } else {
            console.log('Admin user already exists.');
        }

        // Seed default tiles
        // Tile titles use i18n keys (dashboard:tiles.<key>.title / .subtitle).
        // The frontend resolves these via t() for proper multilingual support.
        const defaultTiles = [
            {
                title: 'tiles.contacts.title',
                subtitle: 'tiles.contacts.subtitle',
                url: '/contacts',
                icon: 'FaIdCard',
                backgroundColor: 'rgba(59, 130, 246, 0.3)',
                order: 1,
                isInternal: true,
            },
            {
                title: 'tiles.logs.title',
                subtitle: 'tiles.logs.subtitle',
                url: '/logs',
                icon: 'FaClipboardList',
                backgroundColor: 'rgba(245, 158, 11, 0.3)',
                order: 2,
                isInternal: true,
            },
            {
                title: 'tiles.import.title',
                subtitle: 'tiles.import.subtitle',
                url: '/import',
                icon: 'FaFileImport',
                backgroundColor: 'rgba(16, 185, 129, 0.3)',
                order: 3,
                isInternal: true,
            },
        ];

        let tilesCreated = 0;
        for (const tile of defaultTiles) {
            const [, created] = await DashboardTile.findOrCreate({
                where: { url: tile.url },
                defaults: tile,
            });
            if (created) tilesCreated++;
        }
        console.log(`Tiles: ${tilesCreated} created, ${defaultTiles.length - tilesCreated} already existed.`);

        console.log('Seed complete.');
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

seed();
