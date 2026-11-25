const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AgendaEntry = sequelize.define(
    'AgendaEntry',
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
        createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        updatedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        timeSlot: {
            type: DataTypes.STRING(5),
            allowNull: true,
        },
        endTime: {
            type: DataTypes.STRING(5),
            allowNull: true,
        },
        entryType: {
            type: DataTypes.ENUM('schedule', 'call', 'note', 'task', 'follow_up'),
            allowNull: false,
            defaultValue: 'note',
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('open', 'done', 'migrated', 'cancelled'),
            allowNull: false,
            defaultValue: 'open',
        },
        priority: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 3,
        },
        migratedToDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        migratedFromEntryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'AgendaEntries',
                key: 'id',
            },
        },
        reminderAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        reminderSent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isPrivate: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        indexes: [
            {
                fields: ['ownerId', 'date'],
                name: 'idx_agenda_entries_owner_date',
            },
            {
                unique: true,
                fields: ['migratedFromEntryId', 'date'],
                name: 'idx_agenda_entries_migrated_from_date_unique',
            },
            {
                fields: ['reminderAt', 'reminderSent'],
                name: 'idx_agenda_entries_reminder',
            },
        ],
    },
);

module.exports = AgendaEntry;
