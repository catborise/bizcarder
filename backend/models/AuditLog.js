const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    action: {
        type: DataTypes.STRING, /* Örn: 'CARD_CREATE', 'LOGIN', 'ERROR' */
        allowNull: false
    },
    details: {
        type: DataTypes.TEXT, /* JSON olarak da tutulabilir ama TEXT basit çözüm */
        allowNull: true
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    hooks: {
        afterCreate: async (log, options) => {
            // Log sayısı limiti geçerse, en eskileri sil
            try {
                const { SystemSetting } = require('../models');
                // Ayarı çek, yoksa varsayılan 1000
                const setting = await SystemSetting.findByPk('logRetentionLimit');
                const LIMIT = setting ? parseInt(setting.value, 10) : 1000;

                const count = await AuditLog.count();
                if (count > LIMIT) {
                    // Toplam - Limit kadar en eski kaydı siliyoruz.
                    const logsToDelete = count - LIMIT;

                    // En eski ID'leri bul
                    const oldLogs = await AuditLog.findAll({
                        attributes: ['id'],
                        order: [['createdAt', 'ASC']],
                        limit: logsToDelete
                    });

                    if (oldLogs.length > 0) {
                        const idsToDelete = oldLogs.map(l => l.id);
                        await AuditLog.destroy({
                            where: {
                                id: idsToDelete
                            }
                        });
                        console.log(`Auto-cleanup: Deleted ${idsToDelete.length} old logs.`);
                    }
                }
            } catch (err) {
                console.error('AuditLog auto-cleanup error:', err);
            }
        }
    }
});

// İlişki: Bir log bir kullanıcıya aittir. (Anonim ise null olabilir)
AuditLog.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(AuditLog, { foreignKey: 'userId' });

module.exports = AuditLog;
