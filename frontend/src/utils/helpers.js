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
