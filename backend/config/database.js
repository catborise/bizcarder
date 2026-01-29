const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'crm_db',
    process.env.DB_USER || 'crm_user',
    process.env.DB_PASSWORD || 'crm_password',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: false,
    }
);

module.exports = sequelize;
