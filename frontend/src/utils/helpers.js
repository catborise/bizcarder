/**
 * Hex renk kodunu rgba formatına dönüştürür.
 * @param {string} hex - #RGB veya #RRGGBB formatında renk kodu
 * @param {number} alpha - Opaklık değeri (0-1 arası)
 * @returns {string} rgba(...) formatında renk
 */
export const hexToRgba = (hex, alpha = 0.3) => {
    let r = 0,
        g = 0,
        b = 0;
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
    if (!rgba) return '#3b82f6';
    if (/^#[0-9a-fA-F]{6}$/.test(rgba)) return rgba;
    if (!rgba.startsWith('rgba') && !rgba.startsWith('rgb')) return '#3b82f6';
    const parts = rgba.match(/(\d+)/g);
    if (!parts || parts.length < 3) return '#3b82f6';
    const r = parseInt(parts[0], 10).toString(16).padStart(2, '0');
    const g = parseInt(parts[1], 10).toString(16).padStart(2, '0');
    const b = parseInt(parts[2], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
};
