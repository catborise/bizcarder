const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgendaPage = sequelize.define(
    'AgendaPage',
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
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        freeformNotes: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '',
        },
        privateNotes: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '',
        },
        moodOrPriority: {
            type: DataTypes.STRING(32),
            allowNull: true,
        },
        version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        updatedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['ownerId', 'date'],
                name: 'idx_agenda_pages_owner_date_unique',
            },
        ],
    },
);

module.exports = AgendaPage;
