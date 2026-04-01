const sequelize = require('../config/database');
const { connectDatabase } = require('../models');

module.exports = async () => {
    process.env.NODE_ENV = 'test';
    await connectDatabase();
    await sequelize.sync({ force: true });
    console.log('Test DB synced.');
};
