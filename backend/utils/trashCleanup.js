const { BusinessCard, User } = require('../models');

// Otomatik çöp kutusu temizleme fonksiyonu
async function cleanupOldTrashItems() {
    try {
        const { Op } = require('sequelize');

        // Global ayarı kontrol et
        const { SystemSetting } = require('../models');
        const setting = await SystemSetting.findByPk('trashRetentionDays');
        const retentionDays = setting ? parseInt(setting.value, 10) : 30; // Varsayılan 30 gün

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // Tüm eski silinmiş kartları bul ve sil (Kullanıcı ayrımı yapmaksızın)
        // Eğer kullanıcı bazlı gerekirse eski döngü kullanılabilir ama global ayar istendi.
        const deletedCount = await BusinessCard.destroy({
            where: {
                deletedAt: {
                    [Op.ne]: null, // Zaten destroy sadece deletedAt dolu olanları (paranoid) silmeli ama force:true lazım
                    [Op.lt]: cutoffDate
                }
            },
            force: true // Soft-delete'i tamamen silmek için
        });

        // Not: BusinessCard paranoid model ise normal destroy sadece deletedAt günceller.
        // force: true ile veritabanından tamamen silinir.

        if (deletedCount > 0) {
            console.log(`[AUTO-CLEANUP] ${deletedCount} kart (Retention: ${retentionDays} gün) kalıcı silindi.`);
        }


    } catch (error) {
        console.error('[AUTO-CLEANUP] Hata:', error);
    }
}

// Scheduler - Her gün 02:00'de çalış
function startAutoCleanup() {
    // İlk çalıştırma
    cleanupOldTrashItems();

    // Her 24 saatte bir çalıştır (86400000 ms)
    setInterval(() => {
        const now = new Date();
        // Sadece 02:00-03:00 arasında çalıştır
        if (now.getHours() === 2) {
            cleanupOldTrashItems();
        }
    }, 60 * 60 * 1000); // Her saat kontrol et
}

module.exports = { startAutoCleanup, cleanupOldTrashItems };
