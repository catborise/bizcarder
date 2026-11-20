const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');
const { BusinessCard, User } = require('../models');
const { logger, logAction } = require('../utils/logger');
const { generateVCard } = require('../utils/vcard');
const {
    MAX_EXPORT_ROWS,
    sanitizeForExcel,
    buildCardsQuery,
    buildTagFilterInclude,
    applySelectedIdsFilter,
} = require('../utils/cardHelpers');

exports.exportExcel = async (req, res) => {
    try {
        const { whereClause } = buildCardsQuery(req);
        applySelectedIdsFilter(whereClause, req.query.ids);

        const excelInclude = [{ model: User, as: 'owner', attributes: ['displayName'] }];
        const tagInclude = buildTagFilterInclude(req);
        if (tagInclude) excelInclude.push(tagInclude);

        const cards = await BusinessCard.findAll({
            where: whereClause,
            include: excelInclude,
            order: [['createdAt', 'DESC']],
            limit: MAX_EXPORT_ROWS,
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
            { header: 'Oluşturulma Tarihi', key: 'createdAt', width: 20 },
        ];

        cards.forEach((card) => {
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
                createdAt: card.createdAt.toLocaleString('tr-TR'),
            });
        });

        worksheet.getRow(1).font = { bold: true };
        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=kartvizitler.xlsx');
        res.setHeader('Content-Length', buffer.length);

        res.send(buffer);
        await logAction({
            action: 'CARD_EXCEL_EXPORT',
            details: `Excel dışa aktarma: ${cards.length} kart`,
            req,
        });
    } catch (error) {
        console.error('[EXPORT ERROR] Excel Export Failed:', error);
        logger.error('Excel export error:', error);
        if (!res.headersSent) {
            res.status(500).json({ errorCode: 'EXCEL_EXPORT_FAILED' });
        }
    }
};

exports.exportPdf = async (req, res) => {
    try {
        const { whereClause } = buildCardsQuery(req);
        applySelectedIdsFilter(whereClause, req.query.ids);

        const pdfInclude = [];
        const tagInclude = buildTagFilterInclude(req);
        if (tagInclude) pdfInclude.push(tagInclude);

        const cards = await BusinessCard.findAll({
            where: whereClause,
            include: pdfInclude,
            order: [['createdAt', 'DESC']],
            limit: MAX_EXPORT_ROWS,
        });

        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        const buffers = [];

        const fontPathRegular = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
        const fontPathBold = path.join(__dirname, '../fonts/Roboto-Bold.ttf');

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

        doc.font('Roboto-Bold').fontSize(18).text('Kartvizit Listesi', { align: 'center' });
        doc.moveDown();

        const table = {
            title: 'Tüm İletişim Bilgileri',
            headers: ['Ad Soyad', 'Şirket', 'Ünvan', 'Telefon', 'E-Posta', 'Şehir'],
            rows: cards.map((c) => [
                `${c.firstName} ${c.lastName}`,
                c.company || '-',
                c.title || '-',
                c.phone || '-',
                c.email || '-',
                c.city || '-',
            ]),
        };

        await doc.table(table, {
            prepareHeader: () => doc.font('Roboto-Bold').fontSize(10),
            prepareRow: () => doc.font('Roboto-Regular').fontSize(10),
        });

        doc.end();
        await logAction({
            action: 'CARD_PDF_EXPORT',
            details: `PDF dışa aktarma: ${cards.length} kart`,
            req,
        });
    } catch (error) {
        console.error('[EXPORT ERROR] PDF Export Error:', error);
        logger.error('PDF export error:', error);
        if (!res.headersSent) {
            res.status(500).json({ errorCode: 'PDF_EXPORT_FAILED' });
        }
    }
};

exports.exportAllVcf = async (req, res) => {
    try {
        const { whereClause } = buildCardsQuery(req);
        applySelectedIdsFilter(whereClause, req.query.ids);
        const tagInclude = buildTagFilterInclude(req);

        const cards = await BusinessCard.findAll({
            where: whereClause,
            ...(tagInclude ? { include: [tagInclude] } : {}),
            attributes: [
                'id',
                'firstName',
                'lastName',
                'company',
                'title',
                'email',
                'phone',
                'website',
                'address',
                'city',
                'country',
                'notes',
            ],
            order: [
                ['firstName', 'ASC'],
                ['lastName', 'ASC'],
            ],
            limit: MAX_EXPORT_ROWS,
        });

        if (cards.length === 0) {
            return res.status(404).json({ errorCode: 'VCARD_NOT_FOUND' });
        }

        const vcfContent = cards.map((card) => generateVCard(card)).join('\r\n');

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="contacts_${new Date().toISOString().slice(0, 10)}.vcf"`,
        );
        res.send(vcfContent);

        await logAction({
            action: 'CARD_BULK_VCF_EXPORT',
            details: `Bulk vCard export: ${cards.length} cards`,
            req,
        });
    } catch (error) {
        console.error('Bulk VCF export error:', error);
        res.status(500).json({ errorCode: 'VCARD_EXPORT_FAILED' });
    }
};

exports.exportSingleVcf = async (req, res) => {
    try {
        const { id } = req.params;
        const card = await BusinessCard.findByPk(id);

        if (!card) {
            return res.status(404).json({ errorCode: 'VCARD_NOT_FOUND' });
        }

        if (card.visibility === 'private' && card.ownerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ errorCode: 'VCARD_DOWNLOAD_FORBIDDEN' });
        }

        const vCardContent = generateVCard(card);
        const fileName = `${card.firstName}_${card.lastName}.vcf`.replace(/\s+/g, '_');

        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.send(vCardContent);

        await logAction({
            action: 'CARD_VCF_EXPORT',
            details: `vCard indirildi: ${card.firstName} ${card.lastName}`,
            req,
        });
    } catch (error) {
        console.error('vcf download error:', error);
        res.status(500).json({ errorCode: 'VCARD_EXPORT_FAILED' });
    }
};
