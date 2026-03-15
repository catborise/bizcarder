const winston = require('winston');
const { AuditLog } = require('../models');
const path = require('path');

// Winston Configuration (Application Logs)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'crm-backend' },
    transports: [
        // Hataları 'error.log' dosyasına yaz
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/error.log'), 
            level: 'error' 
        }),
        // Tüm logları 'combined.log' dosyasına yaz
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/combined.log') 
        })
    ]
});

// Geliştirme ortamında konsola da yaz
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

/**
 * İş Kritik Denetim Kaydı (Audit Log) - Veritabanına yazar.
 * KVKK/GDPR uyumu ve önemli kullanıcı hareketleri için.
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

        // Aynı zamanda winston log'una da ekle
        logger.info(`Audit: ${action}`, { userId, ipAddress, details });
    } catch (error) {
        logger.error('Loglama hatası (DB):', error);
    }
};

module.exports = {
    logger,
    logAction
};
