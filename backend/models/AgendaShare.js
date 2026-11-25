const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgendaShare = sequelize.define(
    'AgendaShare',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        ownerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        shareTokenHash: {
            type: DataTypes.STRING(64),
            allowNull: false,
        },
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        sharedWithUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        viewCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['shareTokenHash'],
                name: 'idx_agenda_shares_token_hash_unique',
            },
            {
                fields: ['ownerId'],
                name: 'idx_agenda_shares_owner_id',
            },
            {
                fields: ['sharedWithUserId'],
                name: 'idx_agenda_shares_shared_with_user',
            },
        ],
    },
);

module.exports = AgendaShare;
