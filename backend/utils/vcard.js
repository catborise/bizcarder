/**
 * vCard özel karakterlerini temizler.
 */
const escapeVCard = (text) => {
    if (!text) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
};

/**
 * Kartvizit objesini vCard (VCF) formatına dönüştürür.
 * @param {Object} card - BusinessCard model örneği
 * @returns {String} - vCard formatında metin
 */
const generateVCard = (card) => {
    const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${escapeVCard(card.firstName)} ${escapeVCard(card.lastName)}`,
        `N:${escapeVCard(card.lastName)};${escapeVCard(card.firstName)};;;`,
        card.company ? `ORG:${escapeVCard(card.company)}` : null,
        card.title ? `TITLE:${escapeVCard(card.title)}` : null,
        card.email ? `EMAIL;TYPE=INTERNET;TYPE=WORK:${escapeVCard(card.email)}` : null,
        card.phone ? `TEL;TYPE=CELL:${escapeVCard(card.phone)}` : null,
        card.website ? `URL:${escapeVCard(card.website)}` : null,
        card.address || card.city || card.country ? `ADR;TYPE=WORK:;;${escapeVCard(card.address)};${escapeVCard(card.city)};;${escapeVCard(card.country)}` : null,
        card.notes ? `NOTE:${escapeVCard(card.notes)}` : null,
        'END:VCARD'
    ];

    return lines.filter(line => line !== null).join('\r\n');
};

module.exports = { generateVCard };
