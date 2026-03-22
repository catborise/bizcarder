/**
 * Metni Title Case formatına dönüştürür (Her kelimenin ilk harfi büyük).
 * Örn: "muhammet sağ" -> "Muhammet Sağ"
 * @param {string} str 
 * @returns {string}
 */
const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

module.exports = {
    toTitleCase
};
