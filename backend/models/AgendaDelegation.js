const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgendaDelegation = sequelize.define(
    'AgendaDelegation',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        principalUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        delegateUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        permission: {
            type: DataTypes.ENUM('read', 'write'),
            allowNull: false,
            defaultValue: 'write',
        },
        startsAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        endsAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        note: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        indexes: [
            {
                fields: ['principalUserId', 'delegateUserId', 'isActive'],
                name: 'idx_agenda_delegations_principal_delegate_active',
            },
            {
                fields: ['delegateUserId', 'isActive', 'endsAt'],
                name: 'idx_agenda_delegations_delegate_active_ends',
            },
        ],
    },
);

module.exports = AgendaDelegation;
