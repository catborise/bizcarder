'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Admin User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin', salt);

    await queryInterface.bulkInsert('Users', [{
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
      updatedAt: new Date()
    }], {});

    // 2. Dashboard Tiles
    await queryInterface.bulkInsert('DashboardTiles', [
      { title: 'Kartvizitler', subtitle: 'Kişi listesini yönet', url: '/contacts', icon: 'FaIdCard', backgroundColor: 'rgba(96, 60, 186, 0.3)', order: 1, isInternal: true, createdAt: new Date(), updatedAt: new Date() },
      { title: 'İşlem Kayıtları', subtitle: 'Sistem loglarını incele', url: '/logs', icon: 'FaHistory', backgroundColor: 'rgba(218, 83, 44, 0.3)', order: 2, isInternal: true, createdAt: new Date(), updatedAt: new Date() },
      { title: 'İK Portalı', subtitle: 'İzin ve bordro işlemleri', url: '#', icon: 'FaBuilding', backgroundColor: 'rgba(0, 163, 0, 0.3)', order: 3, isInternal: false, createdAt: new Date(), updatedAt: new Date() },
      { title: 'Personel Listesi', subtitle: 'Dahili rehber', url: '#', icon: 'FaUsers', backgroundColor: 'rgba(43, 87, 151, 0.3)', order: 4, isInternal: false, createdAt: new Date(), updatedAt: new Date() },
      { title: 'Intranet', subtitle: 'Kurumsal duyurular', url: '#', icon: 'FaGlobe', backgroundColor: 'rgba(227, 162, 26, 0.3)', order: 5, isInternal: false, createdAt: new Date(), updatedAt: new Date() },
      { title: 'IT Destek', subtitle: 'Talep oluştur', url: '#', icon: 'FaLifeRing', backgroundColor: 'rgba(159, 0, 167, 0.3)', order: 6, isInternal: false, createdAt: new Date(), updatedAt: new Date() },
      { title: 'Toplu İçe Aktar', subtitle: 'CSV/XLSX ile toplu veri', url: '/import', icon: 'FaFileImport', backgroundColor: 'rgba(59, 130, 246, 0.3)', order: 7, isInternal: true, createdAt: new Date(), updatedAt: new Date() },
      { title: 'Hakkında', subtitle: 'Sistem yetenekleri ve iletişim', url: '/about', icon: 'FaInfoCircle', backgroundColor: 'rgba(32, 201, 151, 0.3)', order: 8, isInternal: true, createdAt: new Date(), updatedAt: new Date() }
    ], {});

    // 3. Tags
    await queryInterface.bulkInsert('Tags', [
      { name: 'Müşteri', color: '#4ade80', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Tedarikçi', color: '#3b82f6', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Potansiyel', color: '#fbbf24', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Sıcak Satış', color: '#f87171', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Fuar/Etkinlik', color: '#a78bfa', createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', { username: 'admin' }, {});
    await queryInterface.bulkDelete('DashboardTiles', null, {});
    await queryInterface.bulkDelete('Tags', null, {});
  }
};
