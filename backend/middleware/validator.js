const { validationResult } = require('express-validator');

/**
 * Express-validator hatalarını yakalayan ve formatlayan middleware.
 * Eğer hata varsa 400 Bad Request döner.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }

    // İlk hatanın mesajını döndür (Frontend'de göstermek kolay olsun diye)
    // Veya tüm hataları bir array olarak dön
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

    return res.status(400).json({
        error: 'Doğrulama Hatası',
        message: errors.array()[0].msg, // Kullanıcıya en üstteki hatayı göster
        details: extractedErrors
    });
};

module.exports = {
    validate
};
