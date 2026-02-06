const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DashboardTile = sequelize.define('DashboardTile', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subtitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    icon: {
        type: DataTypes.STRING, // FaIdCard, FaHistory, etc. (React Icon name)
        defaultValue: 'FaLink'
    },
    backgroundColor: {
        type: DataTypes.STRING,
        defaultValue: 'rgba(96, 60, 186, 0.3)'
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    isInternal: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = DashboardTile;
