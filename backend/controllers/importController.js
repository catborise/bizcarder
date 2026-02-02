const ExcelJS = require('exceljs');
const { BusinessCard } = require('../models');
const { logAction } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Downloads a template for bulk importing cards.
 */
exports.downloadTemplate = async (req, res) => {
    try {
        const type = req.query.format || 'xlsx';
        const columns = [
            { header: 'Ad*', key: 'firstName', width: 20 },
            { header: 'Soyad*', key: 'lastName', width: 20 },
            { header: 'Şirket', key: 'company', width: 25 },
            { header: 'Ünvan', key: 'title', width: 20 },
            { header: 'E-Posta', key: 'email', width: 30 },
            { header: 'Telefon', key: 'phone', width: 20 },
            { header: 'Adres', key: 'address', width: 35 },
            { header: 'Şehir', key: 'city', width: 15 },
            { header: 'Ülke', key: 'country', width: 15 },
            { header: 'Web Sitesi', key: 'website', width: 25 },
            { header: 'Notlar', key: 'notes', width: 30 }
        ];

        if (type === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Kartvizit_Sablonu');
            worksheet.columns = columns;

            // Ornek veri ekle
            worksheet.addRow({
                firstName: 'Ali',
                lastName: 'Yılmaz',
                company: 'Örnek A.Ş.',
                title: 'Müdür',
                email: 'ali.yilmaz@example.com',
                phone: '05551112233',
                city: 'İSTANBUL',
                country: 'TÜRKİYE'
            });

            worksheet.getRow(1).font = { bold: true };

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=kartvizit_sablon.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        } else {
            // CSV
            let csv = columns.map(col => col.header).join(',') + '\n';
            csv += 'Veli,Can,Test Ltd,Yazılımcı,veli.can@example.com,05442223344,Adres Sk No:1,ANKARA,TÜRKİYE,www.veli.com,Test notu';

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=kartvizit_sablon.csv');
            res.send('\uFEFF' + csv); // UTF-8 BOM for Excel compatibility
        }
    } catch (error) {
        console.error('Template Download Error:', error);
        res.status(500).json({ error: 'Şablon oluşturulurken hata oluştu.' });
    }
};

/**
 * Processes the uploaded import file.
 */
exports.importCards = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Dosya yüklenmedi.' });
        }

        const filePath = req.file.path;
        const extension = path.extname(req.file.originalname).toLowerCase();
        let cardsToCreate = [];
        let errors = [];

        if (extension === '.xlsx') {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.getWorksheet(1);

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip headers

                const cardData = {
                    firstName: getCellValue(row.getCell(1)).trim(),
                    lastName: getCellValue(row.getCell(2)).trim(),
                    company: getCellValue(row.getCell(3)),
                    title: getCellValue(row.getCell(4)),
                    email: getCellValue(row.getCell(5)).trim(),
                    phone: getCellValue(row.getCell(6)),
                    address: getCellValue(row.getCell(7)),
                    city: getCellValue(row.getCell(8)),
                    country: getCellValue(row.getCell(9)),
                    website: getCellValue(row.getCell(10)),
                    notes: getCellValue(row.getCell(11)),
                    ownerId: req.user.id,
                    visibility: 'private'
                };

                const validation = validateCard(cardData, rowNumber);
                if (validation.isValid) {
                    cardsToCreate.push(formatCard(cardData));
                } else {
                    errors.push(validation.error);
                }
            });
        } else if (extension === '.csv') {
            const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
            const lines = content.split(/\r?\n/);
            const headers = lines[0].split(',');

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',');
                const cardData = {
                    firstName: (values[0] || '').trim(),
                    lastName: (values[1] || '').trim(),
                    company: (values[2] || '').trim(),
                    title: (values[3] || '').trim(),
                    email: (values[4] || '').trim(),
                    phone: (values[5] || '').trim(),
                    address: (values[6] || '').trim(),
                    city: (values[7] || '').trim(),
                    country: (values[8] || '').trim(),
                    website: (values[9] || '').trim(),
                    notes: (values[10] || '').trim(),
                    ownerId: req.user.id,
                    visibility: 'private'
                };

                const validation = validateCard(cardData, i + 1);
                if (validation.isValid) {
                    cardsToCreate.push(formatCard(cardData));
                } else {
                    errors.push(validation.error);
                }
            }
        }

        // Clean up temp file
        fs.unlinkSync(filePath);

        if (cardsToCreate.length > 0) {
            await BusinessCard.bulkCreate(cardsToCreate);
            await logAction({
                action: 'BULK_IMPORT',
                details: `${cardsToCreate.length} kart içe aktarıldı. ${errors.length} hata atlandı.`,
                req
            });
        }

        res.json({
            success: true,
            importedCount: cardsToCreate.length,
            errorCount: errors.length,
            errors: errors
        });

    } catch (error) {
        console.error('Import processing error:', error);
        res.status(500).json({ error: 'Dosya işlenirken hata oluştu: ' + error.message });
    }
};

/**
 * Helper to extract string value from various Excel cell types (Hyperlink, RichText, Formulas etc.)
 */
function getCellValue(cell) {
    if (!cell || cell.value === null || cell.value === undefined) return '';

    const val = cell.value;

    // Handle Hyperlinks { text: '...', hyperlink: '...' }
    if (typeof val === 'object' && val.text) return val.text.toString();

    // Handle Rich Text { richText: [...] }
    if (typeof val === 'object' && val.richText) {
        return val.richText.map(rt => rt.text).join('');
    }

    // Handle Formulas { formula: '...', result: '...' }
    if (typeof val === 'object' && val.result !== undefined) return val.result.toString();

    return val.toString();
}

/**
 * Validation helper
 */
function validateCard(data, rowNumber) {
    if (!data.firstName || data.firstName.trim() === '') {
        return { isValid: false, error: `Satır ${rowNumber}: Ad alanı zorunludur.` };
    }
    if (!data.lastName || data.lastName.trim() === '') {
        return { isValid: false, error: `Satır ${rowNumber}: Soyad alanı zorunludur.` };
    }
    // E-mail validation if present
    const email = data.email ? data.email.toString().trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        return { isValid: false, error: `Satır ${rowNumber}: Geçersiz e-posta adresi (${email}).` };
    }
    return { isValid: true };
}

/**
 * Formatting helper (TitleCase etc)
 */
function formatCard(data) {
    const toTitleCase = (str) => {
        if (!str) return '';
        return str.toString().replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    return {
        ...data,
        firstName: toTitleCase(data.firstName.trim()),
        lastName: data.lastName.trim().toUpperCase(),
        email: data.email ? data.email.toString().trim() : null,
        city: data.city ? data.city.trim().toUpperCase() : null,
        country: data.country ? data.country.trim().toUpperCase() : null
    };
}
