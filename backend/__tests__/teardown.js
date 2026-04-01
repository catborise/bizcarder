const sequelize = require('../config/database');

module.exports = async () => {
    await sequelize.close();
    console.log('Test DB connection closed.');
};
