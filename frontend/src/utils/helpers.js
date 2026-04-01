/**
 * Hex renk kodunu rgba formatına dönüştürür.
 * @param {string} hex - #RGB veya #RRGGBB formatında renk kodu
 * @param {number} alpha - Opaklık değeri (0-1 arası)
 * @returns {string} rgba(...) formatında renk
 */
export const hexToRgba = (hex, alpha = 0.3) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * rgba renk kodunu hex formatına dönüştürür.
 * @param {string} rgba - rgba(...) formatında renk
 * @returns {string} #RRGGBB formatında renk kodu
 */
export const rgbaToHex = (rgba) => {
    if (!rgba || !rgba.startsWith('rgba')) return 'var(--accent-primary)';
    const parts = rgba.match(/(\d+)/g);
    if (!parts || parts.length < 3) return 'var(--accent-primary)';
    const r = parseInt(parts[0]).toString(16).padStart(2, '0');
    const g = parseInt(parts[1]).toString(16).padStart(2, '0');
    const b = parseInt(parts[2]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
};

/**
 * Metni Title Case formatına dönüştürür (Her kelimenin ilk harfi büyük).
 * @param {string} str
 * @returns {string}
 */
export const toTitleCase = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

/**
 * Dosya indirme işlemini tetikler.
 * @param {Blob} blob 
 * @param {string} fileName 
 * @param {string} mimeType 
 */
export const downloadFile = (blob, fileName, mimeType) => {
    const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
};
