/**
 * Kartvizit objesini vCard (VCF) formatına dönüştürür.
 * @param {Object} card - BusinessCard model örneği
 * @returns {String} - vCard formatında metin
 */
const generateVCard = (card) => {
    const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${card.firstName || ''} ${card.lastName || ''}`,
        `N:${card.lastName || ''};${card.firstName || ''};;;`,
        card.company ? `ORG:${card.company}` : null,
        card.title ? `TITLE:${card.title}` : null,
        card.email ? `EMAIL;TYPE=INTERNET;TYPE=WORK:${card.email}` : null,
        card.phone ? `TEL;TYPE=CELL:${card.phone}` : null,
        card.website ? `URL:${card.website}` : null,
        card.address || card.city || card.country ? `ADR;TYPE=WORK:;;${card.address || ''};${card.city || ''};;${card.country || ''}` : null,
        card.notes ? `NOTE:${card.notes.replace(/\n/g, '\\n')}` : null,
        'END:VCARD'
    ];

    return lines.filter(line => line !== null).join('\r\n');
};

module.exports = { generateVCard };
