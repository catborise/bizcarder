import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';

const Settings = () => {
    const [settings, setSettings] = useState({
        logRetentionLimit: 1000,
        trashRetentionDays: 30,
        allowPublicRegistration: true
    });
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/api/settings');
                setSettings(res.data);
            } catch (error) {
                console.error('Settings fetch error:', error);
                // Eğer admin değilse 403 dönebilir, bilgilendir
                if (error.response && error.response.status === 403) {
                    showNotification('Bu sayfayı görüntüleme yetkiniz yok.', 'error');
                } else {
                    showNotification('Ayarlar yüklenemedi.', 'error');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [showNotification]);

    const handleSave = async () => {
        try {
            await api.put('/api/settings', settings);
            showNotification('Ayarlar başarıyla güncellendi.', 'success');
        } catch (error) {
            console.error('Settings save error:', error);
            showNotification('Kaydetme başarısız: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Yükleniyor...</div>;

    return (
        <div className="fade-in">
            <h2 style={{
                marginBottom: '30px',
                fontWeight: '700',
                fontSize: '2.5rem',
                color: 'white',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                <span style={{ fontSize: '2rem' }}>⚙️</span> Sistem Ayarları
            </h2>

            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '30px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                maxWidth: '600px'
            }}>
                {/* Log Limit */}
                <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', color: '#ffc107', marginBottom: '10px', fontWeight: '600' }}>
                        📜 Log Kayıt Limiti (Satır)
                    </label>
                    <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '10px' }}>
                        Veritabanında tutulacak maksimum işlem kaydı sayısı. Bu sayı aşıldığında en eski kayıtlar otomatik silinir.
                    </p>
                    <input
                        type="number"
                        min="10"
                        value={settings.logRetentionLimit}
                        onChange={(e) => setSettings({ ...settings, logRetentionLimit: parseInt(e.target.value) || 0 })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                {/* Trash Retention */}
                <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', color: '#dc3545', marginBottom: '10px', fontWeight: '600' }}>
                        🗑️ Çöp Kutusu Saklama Süresi (Gün)
                    </label>
                    <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '10px' }}>
                        Silinen kartvizitlerin çöp kutusunda kaç gün saklanacağı. Süresi dolanlar kalıcı olarak silinir.
                    </p>
                    <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.trashRetentionDays}
                        onChange={(e) => setSettings({ ...settings, trashRetentionDays: parseInt(e.target.value) || 0 })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                {/* Public Registration */}
                <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <label style={{ display: 'block', color: '#4ade80', marginBottom: '5px', fontWeight: '600' }}>
                                👤 Yeni Kullanıcı Kaydı (Public)
                            </label>
                            <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>
                                Bu özellik kapalıyken dışarıdan yeni kullanıcı kaydı yapılamaz. Sadece mevcut kullanıcılar giriş yapabilir.
                            </p>
                        </div>
                        <div style={{ position: 'relative', width: '50px', height: '26px' }}>
                            <input
                                type="checkbox"
                                checked={settings.allowPublicRegistration}
                                onChange={(e) => setSettings({ ...settings, allowPublicRegistration: e.target.checked })}
                                style={{
                                    opacity: 0,
                                    width: 0,
                                    height: 0,
                                    position: 'absolute'
                                }}
                                id="reg-toggle"
                            />
                            <label
                                htmlFor="reg-toggle"
                                style={{
                                    position: 'absolute',
                                    cursor: 'pointer',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: settings.allowPublicRegistration ? '#4ade80' : '#444',
                                    transition: '0.4s',
                                    borderRadius: '34px',
                                }}
                            >
                                <span style={{
                                    position: 'absolute',
                                    content: '""',
                                    height: '20px',
                                    width: '20px',
                                    left: '3px',
                                    bottom: '3px',
                                    backgroundColor: 'white',
                                    transition: '0.4s',
                                    borderRadius: '50%',
                                    transform: settings.allowPublicRegistration ? 'translateX(24px)' : 'translateX(0)'
                                }}></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleSave}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 30px',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 85, 247, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(168, 85, 247, 0.4)';
                        }}
                    >
                        💾 Değişiklikleri Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
