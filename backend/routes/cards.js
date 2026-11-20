const express = require('express');
const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const { validate } = require('../middleware/validator');
const { BusinessCard, User, BusinessCardHistory, Tag } = require('../models');
const { toTitleCase } = require('../utils/helpers');
const { logger, logAction } = require('../utils/logger');
const { cleanupUploadedFiles, validateUploadedImages } = require('../utils/fileSecurity');
const {
    escapeLikeWildcards,
    getAuthorizedTagIds,
    upload,
    uploadFields,
    importUpload,
    cardValidationRules,
    buildCardsQuery,
} = require('../utils/cardHelpers');
const importController = require('../controllers/importController');
const ocrController = require('../controllers/ocrController');
const cardsExportController = require('../controllers/cardsExportController');
const cardsBulkController = require('../controllers/cardsBulkController');
const { ocrLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Tarihi Gelmiş Hatırlatıcıları Getir
router.get('/due-reminders', async (req, res) => {
    try {
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const whereClause = {
            deletedAt: null,
            reminderDate: {
                [Op.between]: [new Date(0), endOfDay],
            },
        };

        if (req.user && req.user.role !== 'admin') {
            whereClause[Op.or] = [{ ownerId: req.user.id }, { visibility: 'public' }];
        }

        const cards = await BusinessCard.findAll({
            where: whereClause,
            include: [{ model: User, as: 'owner', attributes: ['displayName'] }],
            distinct: true,
            order: [['reminderDate', 'ASC']],
            limit: 50,
        });

        res.json(cards);
    } catch (error) {
        console.error('[ERROR] due-reminders error:', error);
        res.status(500).json({ errorCode: 'REMINDERS_LOAD_FAILED' });
    }
});

// AI OCR Analiz Endpoint
router.post('/analyze-ai', ocrLimiter, upload.single('image'), validateUploadedImages, ocrController.analyzeWithAI);

// Kullanıcının Kendi Kartını Getir
router.get('/personal', async (req, res) => {
    try {
        const card = await BusinessCard.findOne({
            where: {
                ownerId: req.user.id,
                isPersonal: true,
                deletedAt: null,
            },
        });
        res.json(card);
    } catch (error) {
        console.error('Personal card fetch error:', error);
        res.status(500).json({ errorCode: 'PERSONAL_CARD_LOAD_FAILED' });
    }
});

// Mükerrer Kayıt Kontrolü (yetki ve wildcard korumalı)
router.get('/check-duplicate', async (req, res) => {
    try {
        const { firstName, lastName, email, phone } = req.query;
        const conditions = [];

        if (typeof firstName === 'string' && typeof lastName === 'string' && firstName.trim() && lastName.trim()) {
            conditions.push({
                [Op.and]: [
                    { firstName: { [Op.iLike]: escapeLikeWildcards(firstName.trim()) } },
                    { lastName: { [Op.iLike]: escapeLikeWildcards(lastName.trim()) } },
                ],
            });
        }

        if (typeof email === 'string' && email.trim()) {
            conditions.push({ email: { [Op.iLike]: escapeLikeWildcards(email.trim()) } });
        }

        if (typeof phone === 'string' && phone.trim()) {
            conditions.push({ phone: { [Op.like]: `%${escapeLikeWildcards(phone.trim())}%` } });
        }

        if (conditions.length === 0) {
            return res.json(null);
        }

        const whereClause = {
            deletedAt: null,
            [Op.and]: [{ [Op.or]: conditions }],
        };

        if (req.user && req.user.role !== 'admin') {
            whereClause[Op.and].push({
                [Op.or]: [{ ownerId: req.user.id }, { visibility: 'public' }],
            });
        }

        const existingCard = await BusinessCard.findOne({
            where: whereClause,
            include: [{ model: User, as: 'owner', attributes: ['displayName'] }],
        });

        res.json(existingCard);
    } catch (error) {
        console.error('Duplicate check error:', error);
        res.status(500).json({ errorCode: 'DUPLICATE_CHECK_FAILED' });
    }
});

// Benzersiz Şehirleri Getir (yetki filtreli)
router.get('/cities', async (req, res) => {
    try {
        const whereClause = {
            city: { [Op.ne]: null },
            deletedAt: null,
        };
        if (req.user && req.user.role !== 'admin') {
            whereClause[Op.or] = [{ ownerId: req.user.id }, { visibility: 'public' }];
        }

        const cities = await BusinessCard.findAll({
            attributes: [[fn('DISTINCT', col('city')), 'city']],
            where: whereClause,
        });
        res.json(
            cities
                .map((c) => c.city)
                .filter(Boolean)
                .sort(),
        );
    } catch (error) {
        logger.error('Cities list error:', error);
        res.status(500).json({ errorCode: 'CITIES_LOAD_FAILED' });
    }
});

// Kart Listesi (sayfalama, arama, filtre, etiket)
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 50), 100);
        const offset = (page - 1) * limit;

        const { whereClause, order } = buildCardsQuery(req);

        const include = [
            { model: User, as: 'owner', attributes: ['displayName', 'email'] },
            {
                model: Tag,
                as: 'tags',
                through: { attributes: [] },
                required: Boolean(req.query.tagId || req.query.tagIds),
                where: req.query.tagId
                    ? { id: req.query.tagId }
                    : req.query.tagIds
                      ? {
                            id: {
                                [Op.in]: Array.isArray(req.query.tagIds)
                                    ? req.query.tagIds
                                    : req.query.tagIds.split(','),
                            },
                        }
                      : undefined,
            },
        ];

        const { count, rows } = await BusinessCard.findAndCountAll({
            where: whereClause,
            include,
            order,
            limit,
            offset,
            distinct: true,
        });

        res.json({
            cards: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit,
            },
        });
    } catch (error) {
        console.error('Cards list error:', error);
        res.status(500).json({ errorCode: 'CARDS_LIST_FAILED' });
    }
});

// Export Rotaları (Excel / PDF)
router.get('/export/excel', cardsExportController.exportExcel);
router.get('/export/pdf', cardsExportController.exportPdf);

// Yeni Kart Ekle
router.post('/', uploadFields, validateUploadedImages, cardValidationRules, validate, async (req, res) => {
    const {
        firstName,
        lastName,
        company,
        title,
        email,
        phone,
        address,
        city,
        country,
        website,
        ocrText,
        notes,
        visibility,
        reminderDate,
        tags,
        leadStatus,
        priority,
        source,
    } = req.body || {};

    if (!firstName || !lastName) {
        cleanupUploadedFiles(req);
        return res.status(400).json({ errorCode: 'FIRST_LAST_NAME_REQUIRED' });
    }
    if ((!email || email.trim() === '') && (!phone || phone.trim() === '')) {
        cleanupUploadedFiles(req);
        return res.status(400).json({ errorCode: 'EMAIL_OR_PHONE_REQUIRED' });
    }

    let parsedTags = null;
    if (tags) {
        try {
            parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
        } catch {
            cleanupUploadedFiles(req);
            return res.status(400).json({ errorCode: 'INVALID_PARAMS' });
        }
    }

    const t = await sequelize.transaction();
    try {
        const frontImageUrl = req.files?.frontImage?.[0] ? `/uploads/${req.files.frontImage[0].filename}` : null;
        const backImageUrl = req.files?.backImage?.[0] ? `/uploads/${req.files.backImage[0].filename}` : null;
        const logoUrl = req.files?.logoImage?.[0] ? `/uploads/${req.files.logoImage[0].filename}` : null;

        const cleanData = {
            firstName: toTitleCase(firstName.trim()),
            lastName: lastName.trim().toUpperCase(),
            company,
            title,
            email: email === '' ? null : email,
            phone: phone === '' ? null : phone,
            address: address || null,
            city: city ? city.trim().toUpperCase() : null,
            country: country ? country.trim().toUpperCase() : null,
            website: website === '' || !website ? null : website,
            frontImageUrl,
            backImageUrl,
            logoUrl,
            ocrText,
            notes,
            visibility,
            isPersonal: req.body.isPersonal === 'true' || req.body.isPersonal === true,
            reminderDate: reminderDate || null,
            leadStatus: leadStatus || 'Cold',
            priority: priority ? parseInt(priority, 10) : 0,
            source: source === '' ? null : source,
            ownerId: req.user.id,
        };

        const newCard = await BusinessCard.create(cleanData, { transaction: t, req });

        if (parsedTags) {
            const authorizedTagIds = await getAuthorizedTagIds(parsedTags, req.user, t);
            await newCard.setTags(authorizedTagIds, { transaction: t });
        }

        await t.commit();

        await logAction({
            action: 'CARD_CREATE',
            details: `Yeni kart eklendi: ${firstName} ${lastName}`,
            req,
        });

        res.status(201).json(newCard);
    } catch (error) {
        await t.rollback();
        cleanupUploadedFiles(req);
        console.error('CARD_CREATE_ERROR Stack:', error.stack);
        await logAction({
            action: 'CARD_CREATE_ERROR',
            details: 'Kart eklenirken sunucu hatası oluştu.',
            req,
        });
        res.status(500).json({ errorCode: 'CARD_CREATE_FAILED' });
    }
});

// Hatırlatıcı Güncelle / Kapat (PATCH)
router.patch('/:id/reminder', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!card || card.deletedAt) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'CARD_NOT_FOUND' });
        }

        if (card.ownerId !== req.user.id && req.user.role !== 'admin') {
            await t.rollback();
            return res.status(403).json({ errorCode: 'CARD_UPDATE_FORBIDDEN' });
        }

        const { reminderDate } = req.body || {};
        await card.update({ reminderDate: reminderDate || null }, { transaction: t, req });
        await t.commit();

        await logAction({
            action: 'CARD_UPDATE',
            details: `Hatırlatıcı güncellendi: ${card.firstName} ${card.lastName}`,
            req,
        });

        res.json(card);
    } catch (error) {
        await t.rollback();
        console.error('Reminder update error:', error);
        res.status(500).json({ errorCode: 'CARD_UPDATE_FAILED' });
    }
});

// Kart Güncelle (PUT)
router.put('/:id', uploadFields, validateUploadedImages, cardValidationRules, validate, async (req, res) => {
    const { tags } = req.body || {};
    let parsedTags = null;
    if (tags) {
        try {
            parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
        } catch {
            cleanupUploadedFiles(req);
            return res.status(400).json({ errorCode: 'INVALID_PARAMS' });
        }
    }

    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!card) {
            await t.rollback();
            cleanupUploadedFiles(req);
            return res.status(404).json({ errorCode: 'CARD_NOT_FOUND' });
        }

        if (card.ownerId !== req.user.id && req.user.role !== 'admin') {
            await t.rollback();
            cleanupUploadedFiles(req);
            return res.status(403).json({ errorCode: 'CARD_UPDATE_FORBIDDEN' });
        }

        const {
            firstName,
            lastName,
            company,
            title,
            email,
            phone,
            address,
            city,
            country,
            website,
            ocrText,
            notes,
            visibility,
            reminderDate,
            leadStatus,
            priority,
            source,
        } = req.body || {};

        const frontImageUrl =
            req.files && req.files['frontImage']
                ? `/uploads/${req.files['frontImage'][0].filename}`
                : card.frontImageUrl;
        const backImageUrl =
            req.files && req.files['backImage'] ? `/uploads/${req.files['backImage'][0].filename}` : card.backImageUrl;
        const logoUrl =
            req.files && req.files['logoImage'] ? `/uploads/${req.files['logoImage'][0].filename}` : card.logoUrl;

        await card.update(
            {
                firstName: firstName ? toTitleCase(firstName.trim()) : card.firstName,
                lastName: lastName ? lastName.trim().toUpperCase() : card.lastName,
                company: company !== undefined ? company || null : card.company,
                title: title !== undefined ? title || null : card.title,
                email: email !== undefined ? email || null : card.email,
                phone: phone !== undefined ? phone || null : card.phone,
                address: address !== undefined ? address || null : card.address,
                city: city !== undefined ? (city ? city.trim().toUpperCase() : null) : card.city,
                country: country !== undefined ? (country ? country.trim().toUpperCase() : null) : card.country,
                website: website !== undefined ? website || null : card.website,
                frontImageUrl,
                backImageUrl,
                logoUrl,
                ocrText: ocrText !== undefined ? ocrText : card.ocrText,
                notes: notes !== undefined ? notes : card.notes,
                visibility: visibility || card.visibility,
                reminderDate: reminderDate !== undefined ? reminderDate || null : card.reminderDate,
                leadStatus: leadStatus || card.leadStatus,
                priority: priority !== undefined ? parseInt(priority, 10) : card.priority,
                source: source !== undefined ? source : card.source,
                isPersonal:
                    req.body.isPersonal !== undefined
                        ? req.body.isPersonal === 'true' || req.body.isPersonal === true
                        : card.isPersonal,
            },
            { transaction: t, req },
        );

        if (parsedTags) {
            const authorizedTagIds = await getAuthorizedTagIds(parsedTags, req.user, t);
            await card.setTags(authorizedTagIds, { transaction: t });
        }

        await t.commit();

        await logAction({
            action: 'CARD_UPDATE',
            details: `Kart güncellendi: ${card.firstName} ${card.lastName}`,
            req,
        });

        res.json(card);
    } catch (error) {
        await t.rollback();
        cleanupUploadedFiles(req);
        console.error('CARD_UPDATE_ERROR Stack:', error.stack);
        await logAction({
            action: 'CARD_UPDATE_ERROR',
            details: 'Kart güncellenirken sunucu hatası oluştu.',
            req,
        });
        res.status(500).json({ errorCode: 'CARD_UPDATE_FAILED' });
    }
});

// Kart Geçmişini Getir
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id);
        if (!card) {
            return res.status(404).json({ errorCode: 'CARD_NOT_FOUND' });
        }

        if (card.visibility === 'private' && card.ownerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ errorCode: 'CARD_HISTORY_FORBIDDEN' });
        }

        const history = await BusinessCardHistory.findAll({
            where: { cardId: id },
            include: [
                {
                    model: User,
                    as: 'editor',
                    attributes: ['id', 'displayName', 'username', 'email'],
                },
            ],
            order: [['version', 'DESC']],
        });

        res.json(history);
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ errorCode: 'CARD_HISTORY_FAILED' });
    }
});

// vCard Export Rotaları (bulk önce, :id sonra)
router.get('/export/vcf', cardsExportController.exportAllVcf);
router.get('/:id/vcf', cardsExportController.exportSingleVcf);

// Kart Sil (Soft Delete)
router.delete('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!card) {
            await t.rollback();
            return res.status(404).json({ errorCode: 'CARD_NOT_FOUND' });
        }

        if (card.ownerId !== req.user.id && req.user.role !== 'admin') {
            await t.rollback();
            return res.status(403).json({ errorCode: 'CARD_DELETE_FORBIDDEN' });
        }

        if (card.deletedAt) {
            await t.rollback();
            return res.status(400).json({ errorCode: 'CARD_ALREADY_DELETED' });
        }

        await card.update(
            {
                deletedAt: new Date(),
                deletedBy: req.user.id,
            },
            { transaction: t, req },
        );

        await t.commit();

        await logAction({
            action: 'CARD_SOFT_DELETE',
            details: `Kart çöp kutusuna taşındı: ${card.firstName} ${card.lastName}`,
            req,
        });

        res.json({ messageCode: 'CARD_SOFT_DELETED' });
    } catch (error) {
        await t.rollback();
        console.error('Soft delete error:', error);
        await logAction({
            action: 'CARD_DELETE_ERROR',
            details: 'Kart silinirken sunucu hatası oluştu.',
            req,
        });
        res.status(500).json({ errorCode: 'CARD_DELETE_FAILED' });
    }
});

// Toplu İşlemler & Çöp Kutusu Rotaları
router.post('/bulk-delete', cardsBulkController.bulkDelete);
router.post('/bulk-visibility', cardsBulkController.bulkVisibility);
router.post('/bulk-tags', cardsBulkController.bulkTags);
router.get('/trash', cardsBulkController.getTrash);
router.post('/:id/restore', cardsBulkController.restoreCard);
router.delete('/:id/permanent', cardsBulkController.permanentDeleteCard);
router.delete('/trash/empty', cardsBulkController.emptyTrash);

// Bulk Import Rotaları
router.get('/import/template', importController.downloadTemplate);
router.post('/import/bulk', importUpload.single('file'), importController.importCards);

module.exports = router;
