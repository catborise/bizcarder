/**
 * Tarayıcılar arası dosya indirme işlemini yönetir.
 * Chrome'daki 'blob' olarak inme sorununu gidermek için zamanlama ve MIME tipi kontrolü eklenmiştir.
 */
export const downloadFile = (data, filename, mimeType) => {
    // Blob oluştur ve Type zorla
    const blob = new Blob([data], { type: mimeType || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);

    // Görünmez yap ve dokümana ekle (bazı tarayıcılar için gereklidir)
    link.style.display = 'none';
    document.body.appendChild(link);

    // Programatik Tıklama
    try {
        link.click();
    } catch (e) {
        // Yedek yöntem
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        link.dispatchEvent(clickEvent);
    }

    // Temizlik
    // Chrome ve mobil tarayıcılar için süreyi makul bir seviyede tutuyoruz
    setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 500);
};
