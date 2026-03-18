'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('BusinessCards', 'leadStatus', {
      type: Sequelize.ENUM('Cold', 'Warm', 'Hot', 'Following-up', 'Converted'),
      defaultValue: 'Cold',
      allowNull: true
    });

    await queryInterface.addColumn('BusinessCards', 'priority', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true
    });

    await queryInterface.addColumn('BusinessCards', 'lastInteractionDate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('BusinessCards', 'source', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('BusinessCards', 'leadStatus');
    await queryInterface.removeColumn('BusinessCards', 'priority');
    await queryInterface.removeColumn('BusinessCards', 'lastInteractionDate');
    await queryInterface.removeColumn('BusinessCards', 'source');
  }
};
