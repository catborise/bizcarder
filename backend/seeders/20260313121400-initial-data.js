'use strict';
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Admin User
        const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || crypto.randomBytes(16).toString('hex');
        if (!process.env.ADMIN_DEFAULT_PASSWORD) {
            console.warn(
                `\n⚠️  No ADMIN_DEFAULT_PASSWORD env var set. Generated random admin password: ${adminPassword}\n   Save this password — it will not be shown again.\n`,
            );
        }
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        await queryInterface.bulkInsert(
            'Users',
            [
                {
                    username: 'admin',
                    password: hashedPassword,
                    email: 'admin@example.com',
                    displayName: 'Sistem Yöneticisi',
                    role: 'admin',
                    isApproved: true,
                    trashRetentionDays: 30,
                    aiOcrEnabled: false,
                    aiOcrProvider: 'openai',
                    isApproved: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            {},
        );

        // 2. Dashboard Tiles
        await queryInterface.bulkInsert(
            'DashboardTiles',
            [
                {
                    title: 'tiles.contacts.title',
                    subtitle: 'tiles.contacts.subtitle',
                    url: '/contacts',
                    icon: 'FaIdCard',
                    backgroundColor: 'rgba(96, 60, 186, 0.3)',
                    order: 1,
                    isInternal: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    title: 'tiles.logs.title',
                    subtitle: 'tiles.logs.subtitle',
                    url: '/logs',
                    icon: 'FaHistory',
                    backgroundColor: 'rgba(218, 83, 44, 0.3)',
                    order: 2,
                    isInternal: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    title: 'tiles.hrPortal.title',
                    subtitle: 'tiles.hrPortal.subtitle',
                    url: '#',
                    icon: 'FaBuilding',
                    backgroundColor: 'rgba(0, 163, 0, 0.3)',
                    order: 3,
                    isInternal: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    title: 'tiles.staffList.title',
                    subtitle: 'tiles.staffList.subtitle',
                    url: '#',
                    icon: 'FaUsers',
                    backgroundColor: 'rgba(43, 87, 151, 0.3)',
                    order: 4,
                    isInternal: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    title: 'tiles.intranet.title',
                    subtitle: 'tiles.intranet.subtitle',
                    url: '#',
                    icon: 'FaGlobe',
                    backgroundColor: 'rgba(227, 162, 26, 0.3)',
                    order: 5,
                    isInternal: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    title: 'tiles.itSupport.title',
                    subtitle: 'tiles.itSupport.subtitle',
                    url: '#',
                    icon: 'FaLifeRing',
                    backgroundColor: 'rgba(159, 0, 167, 0.3)',
                    order: 6,
                    isInternal: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    title: 'tiles.import.title',
                    subtitle: 'tiles.import.subtitle',
                    url: '/import',
                    icon: 'FaFileImport',
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    order: 7,
                    isInternal: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    title: 'tiles.about.title',
                    subtitle: 'tiles.about.subtitle',
                    url: '/about',
                    icon: 'FaInfoCircle',
                    backgroundColor: 'rgba(32, 201, 151, 0.3)',
                    order: 8,
                    isInternal: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            {},
        );

        // 3. Tags
        await queryInterface.bulkInsert(
            'Tags',
            [
                { name: 'Müşteri', color: '#4ade80', createdAt: new Date(), updatedAt: new Date() },
                { name: 'Tedarikçi', color: '#3b82f6', createdAt: new Date(), updatedAt: new Date() },
                { name: 'Potansiyel', color: '#fbbf24', createdAt: new Date(), updatedAt: new Date() },
                { name: 'Sıcak Satış', color: '#f87171', createdAt: new Date(), updatedAt: new Date() },
                { name: 'Fuar/Etkinlik', color: '#a78bfa', createdAt: new Date(), updatedAt: new Date() },
            ],
            {},
        );

        // 4. System Settings
        await queryInterface.bulkInsert(
            'SystemSettings',
            [
                {
                    key: 'trashRetentionDays',
                    value: '30',
                    description: 'Çöp kutusundaki öğelerin kaç gün sonra kalıcı olarak silineceği',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            {},
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('Users', { username: 'admin' }, {});
        await queryInterface.bulkDelete('DashboardTiles', null, {});
        await queryInterface.bulkDelete('Tags', null, {});
        await queryInterface.bulkDelete('SystemSettings', null, {});
    },
};
