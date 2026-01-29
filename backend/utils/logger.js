const { AuditLog } = require('../models');

/**
 * İşlem kaydı oluşturur.
 * @param {Object} params - Log parametreleri
 * @param {string} params.action - İşlem tipi (Örn: 'LOGIN_SUCCESS', 'CARD_ADDED')
 * @param {number|null} params.userId - İşlemi yapan kullanıcı ID
 * @param {string} params.details - Detaylı açıklama veya hata mesajı
 * @param {Object} params.req - Express request objesi (IP ve UserAgent için)
 */
const logAction = async ({ action, userId, details, req }) => {
    try {
        const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null;
        const userAgent = req ? req.headers['user-agent'] : null;

        await AuditLog.create({
            action,
            userId: userId || (req && req.user ? req.user.id : null),
            details: typeof details === 'object' ? JSON.stringify(details) : details,
            ipAddress,
            userAgent
        });
    } catch (error) {
        console.error('Loglama hatası:', error); // Loglama başarısız olsa bile uygulama durmamalı
    }
};

module.exports = { logAction };
