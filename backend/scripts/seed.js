#!/usr/bin/env node
/**
 * Seeds the database with default admin user and dashboard tiles.
 * Safe to run multiple times — skips if data already exists.
 *
 * Usage: node scripts/seed.js
 * Or:    docker exec crm_backend node scripts/seed.js
 */

const { User, DashboardTile, sequelize } = require('../models');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('DB connected.');

        // Seed admin user
        const [admin, adminCreated] = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                email: 'admin@bizcarder.local',
                password: 'admin',
                displayName: 'Admin',
                role: 'admin',
                isApproved: true,
            },
        });
        console.log(adminCreated ? 'Admin user created.' : 'Admin user already exists.');

        // Seed default tiles
        // Tile titles use i18n keys (dashboard:tiles.<key>.title / .subtitle).
        // The frontend resolves these via t() for proper multilingual support.
        const defaultTiles = [
            { title: 'tiles.contacts.title', subtitle: 'tiles.contacts.subtitle', url: '/contacts', icon: 'FaIdCard', backgroundColor: 'rgba(59, 130, 246, 0.3)', order: 1, isInternal: true },
            { title: 'tiles.logs.title', subtitle: 'tiles.logs.subtitle', url: '/logs', icon: 'FaClipboardList', backgroundColor: 'rgba(245, 158, 11, 0.3)', order: 2, isInternal: true },
            { title: 'tiles.import.title', subtitle: 'tiles.import.subtitle', url: '/import', icon: 'FaFileImport', backgroundColor: 'rgba(16, 185, 129, 0.3)', order: 3, isInternal: true },
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
