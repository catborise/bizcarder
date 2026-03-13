const rateLimit = require('express-rate-limit');

/**
 * Genel API Limitleyici
 * Dakikada maksimum 100 istek.
 */
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 dakika
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika sonra tekrar deneyin.' }
});

/**
 * Giriş ve Kayıt Limitleyici (Brute-force koruması)
 * 15 dakikada maksimum 10 deneme.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Güvenlik nedeniyle giriş denemeleriniz kısıtlandı. Lütfen 15 dakika sonra tekrar deneyin.' }
});

/**
 * AI OCR Analiz Limitleyici (Maliyet ve abuse kontrolü)
 * Saatte maksimum 20 analiz.
 */
const ocrLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Saatlik AI analiz limitine ulaştınız. Lütfen daha sonra tekrar deneyin.' }
});

module.exports = {
    apiLimiter,
    authLimiter,
    ocrLimiter
};
