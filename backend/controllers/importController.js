const ExcelJS = require('exceljs');
const { BusinessCard, sequelize } = require('../models');
const vCard = require('vcf');
const { logAction } = require('../utils/logger');
const { toTitleCase } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

const MAX_IMPORT_ROWS = 2000;

function firstVcfValue(prop) {
    if (!prop) return '';
    const item = Array.isArray(prop) ? prop[0] : prop;
    const val = item && typeof item.valueOf === 'function' ? item.valueOf() : item;
    return val != null ? String(val) : '';
}

/**
 * RFC 4180 compliant CSV parser — handles quoted fields with commas and newlines
 */
function parseCSV(text) {
    const rows = [];
    let current = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') {
                field += '"';
                i++; // skip escaped quote
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                field += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                current.push(field);
                field = '';
            } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
                current.push(field);
                rows.push(current);
                current = [];
                field = '';
                if (ch === '\r') i++; // skip \n after \r
            } else {
                field += ch;
            }
        }
    }
    // Last field/row
    if (field || current.length > 0) {
        current.push(field);
        rows.push(current);
    }
    return rows;
}

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
            { header: 'Notlar', key: 'notes', width: 30 },
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
                country: 'TÜRKİYE',
            });

            worksheet.getRow(1).font = { bold: true };

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=kartvizit_sablon.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        } else {
            // CSV
            let csv = columns.map((col) => col.header).join(',') + '\n';
            csv +=
                'Veli,Can,Test Ltd,Yazılımcı,veli.can@example.com,05442223344,Adres Sk No:1,ANKARA,TÜRKİYE,www.veli.com,Test notu';

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
    const filePath = req.file?.path;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Dosya yüklenmedi.' });
        }

        const extension = path.extname(req.file.originalname).toLowerCase();
        let cardsToCreate = [];
        let errors = [];

        if (extension === '.xlsx') {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) {
                return res.status(400).json({
                    errorCode: 'IMPORT_EMPTY_WORKBOOK',
                    error: 'Excel dosyasında çalışma sayfası bulunamadı.',
                });
            }

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip headers
                if (cardsToCreate.length >= MAX_IMPORT_ROWS) return;

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
                    visibility: 'private',
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
            const rows = parseCSV(content);

            for (let i = 1; i < rows.length && cardsToCreate.length < MAX_IMPORT_ROWS; i++) {
                const values = rows[i];
                if (!values || values.length === 0 || (values.length === 1 && !values[0].trim())) continue;
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
                    visibility: 'private',
                };

                const validation = validateCard(cardData, i + 1);
                if (validation.isValid) {
                    cardsToCreate.push(formatCard(cardData));
                } else {
                    errors.push(validation.error);
                }
            }
        } else if (extension === '.vcf') {
            const content = fs.readFileSync(filePath, 'utf8');
            const vCards = vCard.parse(content);

            vCards.slice(0, MAX_IMPORT_ROWS).forEach((card, index) => {
                const nStr = firstVcfValue(card.get('n'));
                const fnStr = firstVcfValue(card.get('fn'));

                let firstName = '';
                let lastName = '';

                if (nStr) {
                    const nValue = nStr.split(';');
                    lastName = nValue[0] || '';
                    firstName = nValue[1] || '';
                } else if (fnStr) {
                    const fnValue = fnStr.split(' ');
                    firstName = fnValue[0] || '';
                    lastName = fnValue.slice(1).join(' ') || '';
                }

                const cardData = {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    company: firstVcfValue(card.get('org')),
                    title: firstVcfValue(card.get('title')),
                    email: firstVcfValue(card.get('email')),
                    phone: firstVcfValue(card.get('tel')),
                    address: '',
                    city: '',
                    country: '',
                    website: firstVcfValue(card.get('url')),
                    notes: firstVcfValue(card.get('note')).replace(/\\n/g, '\n'),
                    ownerId: req.user.id,
                    visibility: 'private',
                };

                // Extract address, city and country from ADR
                const adrStr = firstVcfValue(card.get('adr'));
                if (adrStr) {
                    const adrValue = adrStr.split(';');
                    // ADR format: po-box;extended-address;street;locality;region;postal-code;country
                    cardData.address = adrValue[2] || '';
                    cardData.city = adrValue[3] || '';
                    cardData.country = adrValue[6] || '';
                }

                const validation = validateCard(cardData, index + 1);
                if (validation.isValid) {
                    cardsToCreate.push(formatCard(cardData));
                } else {
                    errors.push(validation.error);
                }
            });
        } else {
            return res
                .status(400)
                .json({ errorCode: 'UNSUPPORTED_FILE_FORMAT', error: 'Desteklenmeyen dosya formatı.' });
        }

        if (cardsToCreate.length > 0) {
            await sequelize.transaction(async (t) => {
                await BusinessCard.bulkCreate(cardsToCreate, { transaction: t });
            });
            await logAction({
                action: 'BULK_IMPORT',
                details: `${cardsToCreate.length} kart içe aktarıldı. ${errors.length} hata atlandı.`,
                req,
            });
        }

        res.json({
            success: true,
            importedCount: cardsToCreate.length,
            errorCount: errors.length,
            errors: errors,
        });
    } catch (error) {
        console.error('Import processing error:', error);
        res.status(500).json({ error: 'Dosya işlenirken teknik bir hata oluştu.' });
    } finally {
        // Always clean up the temp file, even if an exception occurred during parsing
        if (filePath) {
            try {
                fs.unlinkSync(filePath);
            } catch (e) {}
        }
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
        return val.richText.map((rt) => rt.text).join('');
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

exports.parseCSV = parseCSV;

/**
 * Formatting helper (TitleCase etc)
 */
function formatCard(data) {
    return {
        ...data,
        firstName: toTitleCase(data.firstName.trim()),
        lastName: data.lastName.trim().toUpperCase(),
        email: data.email ? data.email.toString().trim() : null,
        city: data.city ? data.city.trim().toUpperCase() : null,
        country: data.country ? data.country.trim().toUpperCase() : null,
    };
}
