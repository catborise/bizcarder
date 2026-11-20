const { validationResult } = require('express-validator');
const { cleanupUploadedFiles } = require('../utils/fileSecurity');

/**
 * Express-validator hatalarını yakalayan ve formatlayan middleware.
 * Eğer hata varsa 400 Bad Request döner ve yüklenmiş geçici dosyaları temizler.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }

    cleanupUploadedFiles(req);

    const errorList = errors.array();
    const extractedErrors = errorList.map((err) => ({ [err.path]: err.msg }));
    const firstMsg = errorList[0].msg;

    return res.status(400).json({
        error: 'Doğrulama Hatası',
        errorCode: /^[A-Z0-9_]+$/.test(firstMsg) ? firstMsg : 'VALIDATION_ERROR',
        message: firstMsg,
        details: extractedErrors,
    });
};

module.exports = {
    validate,
};
