const express = require('express');
const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { BusinessCard, User, BusinessCardHistory, Tag } = require('../models');
const { toTitleCase } = require('../utils/helpers');
const { logAction } = require('../utils/logger');
const { generateVCard } = require('../utils/vcard');
const importController = require('../controllers/importController');
const ocrController = require('../controllers/ocrController');
const { ocrLimiter } = require('../middleware/rateLimiter');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');

function sanitizeForExcel(value) {
    if (typeof value !== 'string') return value;
    if (/^[=+\-@\t\r]/.test(value)) return "'" + value;
    return value;
}

// Multer Ayarları (Dosya Yükleme)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// stats rotası server.js içinde public olarak tanımlandığı için buradakine gerek yok.

// Tarihi Gelmiş Hatırlatıcıları Getir
router.get('/due-reminders', async (req, res) => {
    try {
        const now = new Date();
        // Günün sonuna ayarla (Günün herhangi bir saatindeki hatırlatıcıları yakalamak için)
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const whereClause = {
            deletedAt: null,
            reminderDate: {
                [Op.between]: [new Date(0), endOfDay]
            }
        };

        // Yetki kontrolü
        if (req.user && req.user.role !== 'admin') {
            whereClause[Op.or] = [
                { ownerId: req.user.id },
                { visibility: 'public' }
            ];
        }


        const cards = await BusinessCard.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'owner', attributes: ['displayName'] }
            ],
            distinct: true,
            order: [['reminderDate', 'ASC']],
            limit: 50
        });

        res.json(cards);
    } catch (error) {
        console.error("[ERROR] due-reminders error:", error);
        res.status(500).json({ error: 'Hatırlatıcılar yüklenirken bir hata oluştu.' });
    }
});

// AI OCR Analiz Endpoint
router.post('/analyze-ai', ocrLimiter, upload.single('image'), ocrController.analyzeWithAI);

// Kullanıcının Kendi Kartını Getir
router.get('/personal', async (req, res) => {
    try {
        const card = await BusinessCard.findOne({
            where: {
                ownerId: req.user.id,
                isPersonal: true,
                deletedAt: null
            }
        });
        res.json(card);
    } catch (error) {
        console.error('Personal card fetch error:', error);
        res.status(500).json({ error: 'Kişisel kartvizit yüklenemedi.' });
    }
});

// Mükerrer Kayıt Kontrolü
router.get('/check-duplicate', async (req, res) => {
    try {
        const { firstName, lastName, email, phone } = req.query;

        const conditions = [];

        if (firstName && lastName) {
            conditions.push({
                [Op.and]: [
                    { firstName: { [Op.iLike]: firstName.trim() } },
                    { lastName: { [Op.iLike]: lastName.trim() } }
                ]
            });
        }

        if (email && email.trim()) {
            conditions.push({ email: { [Op.iLike]: email.trim() } });
        }

        if (phone && phone.trim()) {
            conditions.push({ phone: { [Op.like]: `%${phone.trim()}%` } });
        }

        if (conditions.length === 0) {
            return res.json(null);
        }

        const existingCard = await BusinessCard.findOne({
            where: {
                [Op.or]: conditions,
                deletedAt: null
            },
            include: [{ model: User, as: 'owner', attributes: ['displayName'] }]
        });

        res.json(existingCard);
    } catch (error) {
        console.error('Duplicate check error:', error);
        res.status(500).json({ error: 'Kayıt kontrolü sırasında bir hata oluştu.' });
    }
});

// Benzersiz Şehirleri Getir
router.get('/cities', async (req, res) => {
    try {
        const cities = await BusinessCard.findAll({
            attributes: [[fn('DISTINCT', col('city')), 'city']],
            where: {
                city: { [Op.ne]: null },
                deletedAt: null
            }
        });
        res.json(cities.map(c => c.city).filter(Boolean).sort());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper: Sorgu Oluşturucu
const buildCardsQuery = (req) => {
    const { 
        remindersOnly, hasReminder, search, city, cities, 
        tagId, tagIds, sort, dateStart, dateEnd, 
        leadStatus, statuses, source, priority 
    } = req.query;

    const whereClause = {
        deletedAt: null
    };

    // Filtreleme: Sadece Hatırlırıcalar
    if (remindersOnly === 'true' || hasReminder === 'true') {
        whereClause.reminderDate = { [Op.ne]: null };
    }

    // Yetki kontrolü (Admin değilse sadece kendi kartları + public olanlar)
    if (req.user && req.user.role !== 'admin') {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
            [Op.or]: [
                { ownerId: req.user.id },
                { visibility: 'public' }
            ]
        });
    }

    // Arama filtresi
    if (search) {
        const searchTerm = search.toLowerCase();
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
            [Op.or]: [
                { firstName: { [Op.iLike]: `%${searchTerm}%` } },
                { lastName: { [Op.iLike]: `%${searchTerm}%` } },
                { company: { [Op.iLike]: `%${searchTerm}%` } },
                { email: { [Op.iLike]: `%${searchTerm}%` } },
                { title: { [Op.iLike]: `%${searchTerm}%` } },
                { city: { [Op.iLike]: `%${searchTerm}%` } },
                { phone: { [Op.iLike]: `%${searchTerm}%` } },
                { source: { [Op.iLike]: `%${searchTerm}%` } }
            ]
        });
    }

    // Şehir filtresi (Tekil veya Çoklu)
    if (city) {
        whereClause.city = { [Op.iLike]: city };
    } else if (cities) {
        const cityList = Array.isArray(cities) ? cities : cities.split(',');
        whereClause.city = { [Op.in]: cityList };
    }

    // Lead Status filtresi (Tekil veya Çoklu)
    if (leadStatus) {
        whereClause.leadStatus = leadStatus;
    } else if (statuses) {
        const statusList = Array.isArray(statuses) ? statuses : statuses.split(',');
        whereClause.leadStatus = { [Op.in]: statusList };
    }

    // Kaynak filtresi
    if (source) {
        whereClause.source = { [Op.iLike]: `%${source}%` };
    }

    // Öncelik filtresi
    if (priority) {
        whereClause.priority = parseInt(priority);
    }

    // Tarih Aralığı (createdAt üzerinden)
    if (dateStart || dateEnd) {
        whereClause.createdAt = {};
        if (dateStart) whereClause.createdAt[Op.gte] = new Date(dateStart);
        if (dateEnd) {
            const end = new Date(dateEnd);
            end.setHours(23, 59, 59, 999);
            whereClause.createdAt[Op.lte] = end;
        }
    }

    // Sıralama
    let order = [['createdAt', 'DESC']]; // Varsayılan
    if (sort) {
        switch (sort) {
            case 'oldest': order = [['createdAt', 'ASC']]; break;
            case 'nameAsc': order = [['firstName', 'ASC']]; break;
            case 'nameDesc': order = [['firstName', 'DESC']]; break;
            case 'companyAsc': order = [['company', 'ASC']]; break;
            case 'newest': order = [['createdAt', 'DESC']]; break;
            case 'priorityDesc': order = [['priority', 'DESC']]; break;
            case 'lastInteraction': order = [['lastInteractionDate', 'DESC']]; break;
        }
    }

    return { whereClause, order };
};

router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 100);
        const offset = (page - 1) * limit;

        const { whereClause, order } = buildCardsQuery(req);

        // Include Logic for Tags
        const include = [
            { model: User, as: 'owner', attributes: ['displayName', 'email'] },
            { 
                model: Tag, 
                as: 'tags', 
                through: { attributes: [] },
                required: (req.query.tagId || req.query.tagIds) ? true : false,
                where: req.query.tagId 
                    ? { id: req.query.tagId } 
                    : (req.query.tagIds 
                        ? { id: { [Op.in]: Array.isArray(req.query.tagIds) ? req.query.tagIds : req.query.tagIds.split(',') } } 
                        : undefined)
            }
        ];
        
        const { count, rows } = await BusinessCard.findAndCountAll({
            where: whereClause,
            include,
            order,
            limit,
            offset,
            distinct: true // findAndCountAll with include and limit needs distinct for correct count
        });

        res.json({
            cards: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit
            }
        });
    } catch (error) {
        console.error('Cards list error:', error);
        res.status(500).json({ error: 'Kartvizitler listelenirken bir hata oluştu.' });
    }
});

// Excel Export Endpoint
// Excel Export Endpoint
router.get('/export/excel', async (req, res) => {
    try {
        const { whereClause } = buildCardsQuery(req);

        // Eğer ID listesi geldiyse sadece onları çek (max 500)
        if (req.query.ids) {
            const ids = req.query.ids.split(',').slice(0, 500).map(id => parseInt(id)).filter(id => id > 0 && !isNaN(id));
            whereClause.id = { [Op.in]: ids };
        }

        const cards = await BusinessCard.findAll({
            where: whereClause,
            include: [{ model: User, as: 'owner', attributes: ['displayName'] }],
            order: [['createdAt', 'DESC']]
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Kartvizitler');

        worksheet.columns = [
            { header: 'Ad', key: 'firstName', width: 15 },
            { header: 'Soyad', key: 'lastName', width: 15 },
            { header: 'Şirket', key: 'company', width: 20 },
            { header: 'Ünvan', key: 'title', width: 15 },
            { header: 'E-Posta', key: 'email', width: 25 },
            { header: 'Telefon', key: 'phone', width: 15 },
            { header: 'Adres', key: 'address', width: 30 },
            { header: 'Şehir', key: 'city', width: 15 },
            { header: 'Ülke', key: 'country', width: 15 },
            { header: 'Web', key: 'website', width: 20 },
            { header: 'Görünürlük', key: 'visibility', width: 10 },
            { header: 'Ekleyen', key: 'ownerName', width: 15 },
            { header: 'Oluşturulma Tarihi', key: 'createdAt', width: 20 }
        ];

        cards.forEach(card => {
            worksheet.addRow({
                firstName: sanitizeForExcel(card.firstName),
                lastName: sanitizeForExcel(card.lastName),
                company: sanitizeForExcel(card.company),
                title: sanitizeForExcel(card.title),
                email: sanitizeForExcel(card.email),
                phone: sanitizeForExcel(card.phone),
                address: sanitizeForExcel(card.address),
                city: sanitizeForExcel(card.city),
                country: sanitizeForExcel(card.country),
                website: sanitizeForExcel(card.website),
                visibility: card.visibility === 'public' ? 'Herkese Açık' : 'Özel',
                ownerName: sanitizeForExcel(card.owner ? card.owner.displayName : '-'),
                createdAt: card.createdAt.toLocaleString('tr-TR')
            });
        });

        worksheet.getRow(1).font = { bold: true };

        // Buffer'a yaz
        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=kartvizitler.xlsx');
        res.setHeader('Content-Length', buffer.length);

        res.send(buffer);

    } catch (error) {
        console.error('[EXPORT ERROR] Excel Export Failed:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Excel oluşturulurken bir hata meydana geldi: ' + error.message });
        }
    }
});

// PDF Export Endpoint
router.get('/export/pdf', async (req, res) => {
    try {
        const { whereClause } = buildCardsQuery(req);

        // Eğer ID listesi geldiyse sadece onları çek (max 500)
        if (req.query.ids) {
            const ids = req.query.ids.split(',').slice(0, 500).map(id => parseInt(id)).filter(id => id > 0 && !isNaN(id));
            whereClause.id = { [Op.in]: ids };
        }

        const cards = await BusinessCard.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        const fs = require('fs');
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        const buffers = [];

        // Font Yolu Kontrolü
        const fontPathRegular = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
        const fontPathBold = path.join(__dirname, '../fonts/Roboto-Bold.ttf');

        // Fontları kaydet
        try {
            doc.registerFont('Roboto-Regular', fontPathRegular);
            doc.registerFont('Roboto-Bold', fontPathBold);
        } catch (fontError) {
            console.error(`[EXPORT ERROR] Font Error: ${fontError.message}`);
        }

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=kartvizitler.pdf');
            res.setHeader('Content-Length', pdfData.length);

            res.send(pdfData);
        });

        // Başlık
        doc.font('Roboto-Bold').fontSize(18).text('Kartvizit Listesi', { align: 'center' });
        doc.moveDown();

        // Tablo Verisi
        const table = {
            title: "Tüm İletişim Bilgileri",
            headers: ["Ad Soyad", "Şirket", "Ünvan", "Telefon", "E-Posta", "Şehir"],
            rows: cards.map(c => [
                `${c.firstName} ${c.lastName}`,
                c.company || '-',
                c.title || '-',
                c.phone || '-',
                c.email || '-',
                c.city || '-'
            ])
        };

        // Tabloyu Çiz - await kullanarak bekle (pdfkit-table async çalışabilir)
        await doc.table(table, {
            prepareHeader: () => doc.font("Roboto-Bold").fontSize(10),
            prepareRow: (row, i) => doc.font("Roboto-Regular").fontSize(10)
        });

        doc.end();

    } catch (error) {
        console.error('[EXPORT ERROR] PDF Export Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'PDF oluşturulurken bir hata meydana geldi: ' + error.message });
        }
    }
});

// Yeni Kart Ekle (Resim + Veri)
const uploadFields = upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'logoImage', maxCount: 1 }
]);

const cardValidationRules = [
    body('firstName').trim().notEmpty().withMessage('Ad alanı zorunludur.'),
    body('lastName').trim().notEmpty().withMessage('Soyad alanı zorunludur.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Geçerli bir e-posta adresi giriniz.'),
    // phone, website vb. için de eklenebilir
];

router.post('/', uploadFields, cardValidationRules, validate, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { firstName, lastName, company, title, email, phone, address, city, country, website, ocrText, notes, visibility, reminderDate, tags, leadStatus, priority, source } = req.body;

        const frontImageUrl = req.files['frontImage'] ? `/uploads/${req.files['frontImage'][0].filename}` : null;
        const backImageUrl = req.files['backImage'] ? `/uploads/${req.files['backImage'][0].filename}` : null;
        const logoUrl = req.files['logoImage'] ? `/uploads/${req.files['logoImage'][0].filename}` : null;

        // Validasyonlar
        if (!firstName || !lastName) {
            return res.status(400).json({ error: 'Ad ve Soyad alanları zorunludur.' });
        }
        if ((!email || email.trim() === '') && (!phone || phone.trim() === '')) {
            return res.status(400).json({ error: 'E-posta veya Telefon bilgisinden en az biri girilmelidir.' });
        }

        // Veri Formatlama ve Temizleme
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
            isPersonal: req.body.isPersonal === 'true',
            reminderDate: reminderDate || null,
            leadStatus: leadStatus || 'Cold',
            priority: priority ? parseInt(priority, 10) : 0,
            source: source === '' ? null : source,
            ownerId: req.user.id // Kart sahibini kaydet
        };

        const newCard = await BusinessCard.create(cleanData, { transaction: t });

        // Etiket Eşleştirme
        if (tags) {
            const tagIds = Array.isArray(tags) ? tags : JSON.parse(tags);
            await newCard.setTags(tagIds, { transaction: t });
        }

        // LOG: Başarılı Ekleme
        await logAction({
            action: 'CARD_CREATE',
            details: `Yeni kart eklendi: ${firstName} ${lastName}`,
            req
        });

        await t.commit();
        res.status(201).json(newCard);
    } catch (error) {
        await t.rollback();
        console.error("CARD_CREATE_ERROR Stack:", error.stack);
        // LOG: Hata
        await logAction({
            action: 'CARD_CREATE_ERROR',
            details: error.message,
            req
        });
        res.status(500).json({
            error: 'Kart eklenirken bir sunucu hatası oluştu.'
        });
    }
});

// ... POST Router

// Kart Güncelle (PUT)
router.put('/:id', uploadFields, cardValidationRules, validate, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!card) {
            await t.rollback();
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        // Yetki kontrolü: Sadece sahibi veya admin güncelleyebilir
        if (card.ownerId !== req.user.id && req.user.role !== 'admin') {
            await t.rollback();
            return res.status(403).json({ error: 'Bu kartviziti güncelleme yetkiniz bulunmuyor.' });
        }

        const { firstName, lastName, company, title, email, phone, address, city, country, website, ocrText, notes, visibility, reminderDate, tags, leadStatus, priority, source } = req.body;

        // Resim güncelleme varsa (req.files undefined olabilir - JSON request durumunda)
        const frontImageUrl = (req.files && req.files['frontImage']) ? `/uploads/${req.files['frontImage'][0].filename}` : card.frontImageUrl;
        const backImageUrl = (req.files && req.files['backImage']) ? `/uploads/${req.files['backImage'][0].filename}` : card.backImageUrl;
        const logoUrl = (req.files && req.files['logoImage']) ? `/uploads/${req.files['logoImage'][0].filename}` : card.logoUrl;

        // Veri Temizleme ve Güncelleme

        await card.update({
            firstName: firstName ? toTitleCase(firstName.trim()) : card.firstName,
            lastName: lastName ? lastName.trim().toUpperCase() : card.lastName,
            company: company || card.company,
            title: title || card.title,
            email: email || card.email,
            phone: phone || card.phone,
            address: address || card.address,
            city: city ? city.trim().toUpperCase() : card.city,
            country: country ? country.trim().toUpperCase() : card.country,
            website: website || card.website,
            frontImageUrl,
            backImageUrl,
            logoUrl,
            ocrText: ocrText || card.ocrText,
            notes: notes !== undefined ? notes : card.notes,
            visibility: visibility || card.visibility,
            reminderDate: reminderDate !== undefined ? (reminderDate || null) : card.reminderDate,
            leadStatus: leadStatus || card.leadStatus,
            priority: priority !== undefined ? parseInt(priority, 10) : card.priority,
            source: source !== undefined ? source : card.source,
            isPersonal: req.body.isPersonal !== undefined ? (req.body.isPersonal === 'true') : card.isPersonal
        }, { transaction: t });

        // Etiket Güncelleme
        if (tags) {
            const tagIds = Array.isArray(tags) ? tags : JSON.parse(tags);
            await card.setTags(tagIds, { transaction: t });
        }

        // LOG: Güncelleme
        await logAction({
            action: 'CARD_UPDATE',
            details: `Kart güncellendi: ${card.firstName} ${card.lastName}`,
            req
        });

        await t.commit();
        res.json(card);
    } catch (error) {
        await t.rollback();
        console.error("CARD_UPDATE_ERROR Stack:", error.stack);
        await logAction({
            action: 'CARD_UPDATE_ERROR',
            details: error.message,
            req
        });
        res.status(500).json({ error: 'Kart güncellenirken bir sunucu hatası oluştu.' });
    }
});

// Kart Geçmişini Getir
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;

        // Önce kartın varlığını ve yetkiyi kontrol et
        const card = await BusinessCard.findByPk(id);
        if (!card) {
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        // Yetki kontrolü (Normal GET endpoint ile aynı mantık)
        if (card.visibility === 'private' && card.ownerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Bu kartın geçmişini görüntüleme yetkiniz yok.' });
        }

        const history = await BusinessCardHistory.findAll({
            where: { cardId: id },
            include: [
                {
                    model: User,
                    as: 'editor',
                    attributes: ['id', 'displayName', 'username', 'email']
                }
            ],
            order: [['version', 'DESC']]
        });

        res.json(history);
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ error: 'Geçmiş kayıtları yüklenemedi.' });
    }
});

// vCard İndir
router.get('/:id/vcf', async (req, res) => {
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id);

        if (!card) {
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        // Yetki kontrolü
        if (card.visibility === 'private' && card.ownerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Bu kartın vCard dosyasını indirme yetkiniz yok.' });
        }

        const vCardContent = generateVCard(card);
        const fileName = `${card.firstName}_${card.lastName}.vcf`.replace(/\s+/g, '_');

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(vCardContent);

        await logAction({
            action: 'CARD_VCF_EXPORT',
            details: `vCard indirildi: ${card.firstName} ${card.lastName}`,
            req
        });
    } catch (error) {
        console.error('vcf download error:', error);
        res.status(500).json({ error: 'vCard oluşturulamadı.' });
    }
});

// Kart Sil (Soft Delete)
router.delete('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        const card = await BusinessCard.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!card) {
            await t.rollback();
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        // Yetki kontrolü: Sadece sahibi veya admin silebilir
        if (card.ownerId !== req.user.id && req.user.role !== 'admin') {
            await t.rollback();
            return res.status(403).json({ error: 'Bu kartviziti silme yetkiniz bulunmuyor.' });
        }

        if (card.deletedAt) {
            await t.rollback();
            return res.status(400).json({ error: 'Bu kartvizit zaten silinmiş.' });
        }

        // Soft delete: deletedAt ve deletedBy ayarla
        await card.update({
            deletedAt: new Date(),
            deletedBy: req.user.id
        }, { transaction: t });

        await logAction({
            action: 'CARD_SOFT_DELETE',
            details: `Kart çöp kutusuna taşındı: ${card.firstName} ${card.lastName}`,
            req
        });

        await t.commit();
        res.json({ message: 'Kartvizit çöp kutusuna taşındı.' });
    } catch (error) {
        await t.rollback();
        console.error('Soft delete error:', error);
        await logAction({
            action: 'CARD_DELETE_ERROR',
            details: error.message,
            req
        });
        res.status(500).json({ error: 'Kart silinirken bir hata oluştu.' });
    }
});

// --- BULK ACTIONS ---

// Toplu Silme (Soft Delete)
router.post('/bulk-delete', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'ID listesi eksik.' });
        }

        const whereClause = { id: { [Op.in]: ids } };

        // Yetki kontrolü (Normal kullanıcı sadece kendi kartlarını silebilir)
        if (req.user.role !== 'admin') {
            whereClause.ownerId = req.user.id;
        }

        const [updatedCount] = await BusinessCard.update({
            deletedAt: new Date(),
            deletedBy: req.user.id
        }, { where: whereClause, transaction: t });

        await logAction({
            action: 'CARD_BULK_DELETE',
            details: `${updatedCount} adet kart çöp kutusuna taşındı.`,
            req
        });

        await t.commit();
        res.json({ message: `${updatedCount} adet kart vizit başarıyla silindi.`, count: updatedCount });
    } catch (error) {
        await t.rollback();
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Toplu silme sırasında bir hata oluştu.' });
    }
});

// Toplu Görünürlük Güncelleme
router.post('/bulk-visibility', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { ids, visibility } = req.body;
        if (!ids || !Array.isArray(ids) || !['public', 'private'].includes(visibility)) {
            await t.rollback();
            return res.status(400).json({ error: 'Geçersiz parametreler.' });
        }

        const whereClause = { id: { [Op.in]: ids } };
        if (req.user.role !== 'admin') {
            whereClause.ownerId = req.user.id;
        }

        const [updatedCount] = await BusinessCard.update({ visibility }, { where: whereClause, transaction: t });

        await logAction({
            action: 'CARD_BULK_VISIBILITY',
            details: `${updatedCount} adet kartın görünürlüğü ${visibility} yapıldı.`,
            req
        });

        await t.commit();
        res.json({ message: 'Görünürlük başarıyla güncellendi.', count: updatedCount });
    } catch (error) {
        await t.rollback();
        console.error('Bulk visibility error:', error);
        res.status(500).json({ error: 'Toplu güncelleme sırasında bir hata oluştu.' });
    }
});

// Toplu Etiket Ekleme
router.post('/bulk-tags', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { ids, tagIds, mode = 'add' } = req.body; // mode: 'add' (mevcutlara ekle) veya 'replace' (temizle ve yenilerini ekle)
        
        if (!ids || !Array.isArray(ids) || !tagIds || !Array.isArray(tagIds)) {
            return res.status(400).json({ error: 'Geçersiz parametreler.' });
        }

        const whereClause = { id: { [Op.in]: ids } };
        if (req.user.role !== 'admin') {
            whereClause.ownerId = req.user.id;
        }

        const cards = await BusinessCard.findAll({ where: whereClause, transaction: t });
        
        for (const card of cards) {
            if (mode === 'add') {
                await card.addTags(tagIds, { transaction: t });
            } else {
                await card.setTags(tagIds, { transaction: t });
            }
        }

        await logAction({
            action: 'CARD_BULK_TAGS',
            details: `${cards.length} adet karta toplu etiket işlemi yapıldı.`,
            req
        });

        await t.commit();
        res.json({ message: 'Etiketler başarıyla güncellendi.', count: cards.length });
    } catch (error) {
        await t.rollback();
        console.error('Bulk tags error:', error);
        res.status(500).json({ error: 'Toplu etiketleme sırasında bir hata oluştu.' });
    }
});

// --- ... (rest of the file follows) ---
router.get('/trash', async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const whereClause = {
            deletedAt: { [Op.not]: null } // Sadece silinmiş kartları getir
        };

        if (req.user && req.user.role !== 'admin') {
            // Admin değilse: (Kendi sildiği kartlar) VEYA (Public kartları silmiş olanlar)
            whereClause[Op.or] = [
                { deletedBy: req.user.id }, // Kendisinin sildiği
                { visibility: 'public' }    // Herkese açık kartlar
            ];
        }

        const cards = await BusinessCard.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'owner', attributes: ['displayName', 'email'] },
                { model: User, as: 'deleter', foreignKey: 'deletedBy', attributes: ['displayName', 'username'] }
            ],
            order: [['deletedAt', 'DESC']]
        });

        res.json(cards);
    } catch (error) {
        console.error('Trash list error:', error);
        res.status(500).json({ error: 'Çöp kutusu listelenirken bir hata oluştu.' });
    }
});

// Kartı Geri Yükle
router.post('/:id/restore', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!card) {
            await t.rollback();
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        if (!card.deletedAt) {
            await t.rollback();
            return res.status(400).json({ error: 'Bu kartvizit silinmemiş.' });
        }

        // Yetki kontrolü: Sadece admin veya silme işlemini yapan kullanıcı geri yükleyebilir
        if (req.user.role !== 'admin' && card.deletedBy !== req.user.id) {
            await t.rollback();
            return res.status(403).json({ error: 'Bu kartı geri yükleme yetkiniz yok.' });
        }

        await card.update({
            deletedAt: null,
            deletedBy: null
        }, { transaction: t });

        await logAction({
            action: 'CARD_RESTORE',
            details: `Kart geri yüklendi: ${card.firstName} ${card.lastName}`,
            req
        });

        await t.commit();
        res.json({ message: 'Kartvizit geri yüklendi.', card });
    } catch (error) {
        await t.rollback();
        console.error('Restore error:', error);
        res.status(500).json({ error: 'Kart geri yüklenirken bir hata oluştu.' });
    }
});

// Kartı Kalıcı Olarak Sil
router.delete('/:id/permanent', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!card) {
            await t.rollback();
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        // Yetki kontrolü: Sadece admin veya silme işlemini yapan kullanıcı kalıcı silebilir
        if (req.user.role !== 'admin' && card.deletedBy !== req.user.id) {
            await t.rollback();
            return res.status(403).json({ error: 'Bu kartı kalıcı olarak silme yetkiniz yok.' });
        }

        const cardInfo = `${card.firstName} ${card.lastName}`;
        await card.destroy({ transaction: t }); // Hard delete

        await logAction({
            action: 'CARD_PERMANENT_DELETE',
            details: `Kart kalıcı olarak silindi: ${cardInfo}`,
            req
        });

        await t.commit();
        res.json({ message: 'Kartvizit kalıcı olarak silindi.' });
    } catch (error) {
        await t.rollback();
        console.error('Permanent delete error:', error);
        res.status(500).json({ error: 'Kart kalıcı olarak silinemedi.' });
    }
});

// Çöp Kutusunu Boşalt
router.delete('/trash/empty', async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const whereClause = {
            deletedAt: { [Op.not]: null }
        };

        if (req.user.role !== 'admin') {
            // Admin değilse sadece kendi sildiği kartları boşaltabilir
            whereClause.deletedBy = req.user.id;
        }

        const deletedCount = await BusinessCard.destroy({
            where: whereClause
        });

        await logAction({
            action: 'TRASH_EMPTY',
            details: `Çöp kutusu boşaltıldı. ${deletedCount} kart kalıcı olarak silindi.`,
            req
        });

        res.json({ message: `${deletedCount} kartvizit kalıcı olarak silindi.` });
    } catch (error) {
        console.error('Trash empty error:', error);
        res.status(500).json({ error: 'Çöp kutusu boşaltılamadı.' });
    }
});

// Bulk Import Rotaları
router.get('/import/template', importController.downloadTemplate);
router.post('/import/bulk', upload.single('file'), importController.importCards);

module.exports = router;
