const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { BusinessCard, User, BusinessCardHistory } = require('../models');
const { logAction } = require('../utils/logger');
const { generateVCard } = require('../utils/vcard');
const importController = require('../controllers/importController');
const ocrController = require('../controllers/ocrController');

// Multer Ayarları (Dosya Yükleme)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// İstatistikleri Getir (Dashboard için)
router.get('/stats', async (req, res) => {
    try {
        console.log('[DEBUG] Stats endpoint hit');
        const count = await BusinessCard.count();
        res.json({ totalCards: count });
    } catch (error) {
        console.error("Count error:", error);
        res.status(500).json({ error: error.message });
    }
});

// AI OCR Analiz Endpoint
router.post('/analyze-ai', upload.single('image'), ocrController.analyzeWithAI);

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
        res.status(500).json({ error: error.message });
    }
});

// Mükerrer Kayıt Kontrolü
router.get('/check-duplicate', async (req, res) => {
    try {
        const { firstName, lastName } = req.query;
        if (!firstName || !lastName) {
            return res.json(null);
        }

        const { Op } = require('sequelize');
        const existingCard = await BusinessCard.findOne({
            where: {
                firstName: { [Op.iLike]: firstName.trim() },
                lastName: { [Op.iLike]: lastName.trim() },
                deletedAt: null
            },
            include: [{ model: User, as: 'owner', attributes: ['displayName'] }]
        });

        res.json(existingCard);
    } catch (error) {
        console.error('Duplicate check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper: Sorgu Oluşturucu
const buildCardsQuery = (req) => {
    const { Op } = require('sequelize');
    const whereClause = {
        deletedAt: null
    };

    if (req.user && req.user.role !== 'admin') {
        whereClause[Op.or] = [
            { ownerId: req.user.id },
            { visibility: 'public' }
        ];
    }

    // Arama filtresi varsa eklenebilir (req.query.search)
    if (req.query.search) {
        const search = req.query.search.toLowerCase();
        whereClause[Op.and] = [
            {
                [Op.or]: [
                    { firstName: { [Op.iLike]: `%${search}%` } },
                    { lastName: { [Op.iLike]: `%${search}%` } },
                    { company: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } }
                ]
            }
        ];
    }

    return whereClause;
};

router.get('/', async (req, res) => {
    try {
        const whereClause = buildCardsQuery(req);
        const cards = await BusinessCard.findAll({
            where: whereClause,
            include: [{ model: User, as: 'owner', attributes: ['displayName', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(cards);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Excel Export Endpoint
// Excel Export Endpoint
router.get('/export/excel', async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const whereClause = buildCardsQuery(req);

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
                firstName: card.firstName,
                lastName: card.lastName,
                company: card.company,
                title: card.title,
                email: card.email,
                phone: card.phone,
                address: card.address,
                city: card.city,
                country: card.country,
                website: card.website,
                visibility: card.visibility === 'public' ? 'Herkese Açık' : 'Özel',
                ownerName: card.owner ? card.owner.displayName : '-',
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
        const PDFDocument = require('pdfkit-table');
        const whereClause = buildCardsQuery(req);

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
        doc.font('Roboto-Bold').fontSize(18).text('Kartvizit Listesi (Özizleme)', { align: 'center' });
        doc.moveDown();

        // Debug Text for Font Verification
        doc.font('Roboto-Regular').fontSize(12).text('Test Karakterleri: ÇçĞğIıİiÖöŞşÜü', { align: 'center' });
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

router.post('/', uploadFields, async (req, res) => {
    try {
        const { firstName, lastName, company, title, email, phone, address, city, country, website, ocrText, notes, visibility } = req.body;

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

        // Formatlama Fonksiyonları
        const toTitleCase = (str) => {
            if (!str) return '';
            return str.replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        };

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
            ownerId: req.user.id // Kart sahibini kaydet
        };

        const newCard = await BusinessCard.create(cleanData);

        // LOG: Başarılı Ekleme
        await logAction({
            action: 'CARD_CREATE',
            details: `Yeni kart eklendi: ${firstName} ${lastName}`,
            req
        });

        res.status(201).json(newCard);
    } catch (error) {
        console.error("CARD_CREATE_ERROR Stack:", error.stack);
        // LOG: Hata
        await logAction({
            action: 'CARD_CREATE_ERROR',
            details: error.message,
            req
        });
        res.status(500).json({
            error: error.message,
            stack: error.stack // Temporarily return stack for debugging
        });
    }
});

// ... POST Router

// Kart Güncelle (PUT)
router.put('/:id', uploadFields, async (req, res) => {
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id);

        if (!card) {
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        const { firstName, lastName, company, title, email, phone, address, city, country, website, ocrText, notes, visibility } = req.body;

        // Resim güncelleme varsa
        const frontImageUrl = req.files['frontImage'] ? `/uploads/${req.files['frontImage'][0].filename}` : card.frontImageUrl;
        const backImageUrl = req.files['backImage'] ? `/uploads/${req.files['backImage'][0].filename}` : card.backImageUrl;
        const logoUrl = req.files['logoImage'] ? `/uploads/${req.files['logoImage'][0].filename}` : card.logoUrl;

        // Veri Temizleme ve Güncelleme
        const toTitleCase = (str) => {
            if (!str) return null;
            return str.replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        };

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
            notes: notes || card.notes,
            visibility: visibility || card.visibility,
            isPersonal: req.body.isPersonal !== undefined ? (req.body.isPersonal === 'true') : card.isPersonal
        });

        // LOG: Güncelleme
        await logAction({
            action: 'CARD_UPDATE',
            details: `Kart güncellendi: ${card.firstName} ${card.lastName}`,
            req
        });

        res.json(card);
    } catch (error) {
        console.error("CARD_UPDATE_ERROR Stack:", error.stack);
        await logAction({
            action: 'CARD_UPDATE_ERROR',
            details: error.message,
            req
        });
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
});

// Kart Sil (Soft Delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const card = await BusinessCard.findByPk(id);

        if (!card) {
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        if (card.deletedAt) {
            return res.status(400).json({ error: 'Bu kartvizit zaten silinmiş.' });
        }

        // Soft delete: deletedAt ve deletedBy ayarla
        await card.update({
            deletedAt: new Date(),
            deletedBy: req.user.id
        });

        await logAction({
            action: 'CARD_SOFT_DELETE',
            details: `Kart çöp kutusuna taşındı: ${card.firstName} ${card.lastName}`,
            req
        });

        res.json({ message: 'Kartvizit çöp kutusuna taşındı.' });
    } catch (error) {
        await logAction({
            action: 'CARD_DELETE_ERROR',
            details: error.message,
            req
        });
        res.status(500).json({ error: error.message });
    }
});

// Çöp Kutusunu Listele
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
        res.status(500).json({ error: error.message });
    }
});

// Kartı Geri Yükle
router.post('/:id/restore', async (req, res) => {
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id);

        if (!card) {
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        if (!card.deletedAt) {
            return res.status(400).json({ error: 'Bu kartvizit silinmemiş.' });
        }

        // Yetki kontrolü: Sadece admin veya silme işlemini yapan kullanıcı geri yükleyebilir
        if (req.user.role !== 'admin' && card.deletedBy !== req.user.id) {
            return res.status(403).json({ error: 'Bu kartı geri yükleme yetkiniz yok.' });
        }

        await card.update({
            deletedAt: null,
            deletedBy: null
        });

        await logAction({
            action: 'CARD_RESTORE',
            details: `Kart geri yüklendi: ${card.firstName} ${card.lastName}`,
            req
        });

        res.json({ message: 'Kartvizit geri yüklendi.', card });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Kartı Kalıcı Olarak Sil
router.delete('/:id/permanent', async (req, res) => {
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id);

        if (!card) {
            return res.status(404).json({ error: 'Kartvizit bulunamadı.' });
        }

        // Yetki kontrolü: Sadece admin veya silme işlemini yapan kullanıcı kalıcı silebilir
        if (req.user.role !== 'admin' && card.deletedBy !== req.user.id) {
            return res.status(403).json({ error: 'Bu kartı kalıcı olarak silme yetkiniz yok.' });
        }

        const cardInfo = `${card.firstName} ${card.lastName}`;
        await card.destroy(); // Hard delete

        await logAction({
            action: 'CARD_PERMANENT_DELETE',
            details: `Kart kalıcı olarak silindi: ${cardInfo}`,
            req
        });

        res.json({ message: 'Kartvizit kalıcı olarak silindi.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
});

// Bulk Import Rotaları
router.get('/import/template', importController.downloadTemplate);
router.post('/import/bulk', upload.single('file'), importController.importCards);

module.exports = router;
