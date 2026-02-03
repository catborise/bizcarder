import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { user, checkAuth } = useAuth();
    const [systemSettings, setSystemSettings] = useState({
        logRetentionLimit: 1000,
        trashRetentionDays: 30,
        allowPublicRegistration: true
    });
    const [aiSettings, setAiSettings] = useState({
        aiOcrEnabled: false,
        aiOcrProvider: 'openai',
        aiOcrApiKey: ''
    });
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        const fetchSystemSettings = async () => {
            if (user?.role !== 'admin') {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get('/api/settings');
                setSystemSettings(res.data);
            } catch (error) {
                console.error('Settings fetch error:', error);
                if (error.response && error.response.status === 403) {
                    // Sadece logla, yetki hatası normal (admin değilse)
                } else {
                    showNotification('Sistem ayarları yüklenemedi.', 'error');
                }
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            setAiSettings({
                aiOcrEnabled: user.aiOcrEnabled || false,
                aiOcrProvider: user.aiOcrProvider || 'openai',
                aiOcrApiKey: '' // Güvenlik için boş bırakıyoruz
            });
            fetchSystemSettings();
        }
    }, [user, showNotification]);

    const handleSaveSystem = async () => {
        try {
            await api.put('/api/settings', systemSettings);
            showNotification('Sistem ayarları başarıyla güncellendi.', 'success');
        } catch (error) {
            console.error('Settings save error:', error);
            showNotification('Kaydetme başarısız: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handleSaveAI = async () => {
        try {
            const res = await api.put('/auth/profile', aiSettings);
            if (res.data.success) {
                showNotification('AI ayarları başarıyla güncellendi.', 'success');
                await checkAuth(); // Global auth state'i güncelle
            }
        } catch (error) {
            console.error('AI Settings save error:', error);
            showNotification('AI ayarları kaydedilemedi: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Yükleniyor...</div>;

    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '30px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        maxWidth: '700px',
        marginBottom: '30px'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: 'white',
        fontSize: '1rem',
        marginTop: '8px'
    };

    const sectionTitleStyle = {
        marginBottom: '20px',
        fontWeight: '700',
        fontSize: '1.8rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '50px' }}>
            <h2 style={{
                marginBottom: '40px',
                fontWeight: '700',
                fontSize: '2.5rem',
                color: 'white',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                <span style={{ fontSize: '2rem' }}>⚙️</span> Ayarlar
            </h2>

            {/* KIŞISEL AI AYARLARI */}
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                    <span style={{ fontSize: '1.5rem' }}>🤖</span> Kişisel AI Ayarları
                </h3>

                <div style={{ marginBottom: '25px', padding: '15px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <label style={{ display: 'block', color: '#818cf8', marginBottom: '5px', fontWeight: '600' }}>
                                AI Destekli OCR
                            </label>
                            <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>
                                Kartvizit tarama işleminde daha yüksek doğruluk için bulut tabanlı AI modellerini kullanın.
                            </p>
                        </div>
                        <div style={{ position: 'relative', width: '50px', height: '26px' }}>
                            <input
                                type="checkbox"
                                checked={aiSettings.aiOcrEnabled}
                                onChange={(e) => setAiSettings({ ...aiSettings, aiOcrEnabled: e.target.checked })}
                                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                id="ai-toggle"
                            />
                            <label
                                htmlFor="ai-toggle"
                                style={{
                                    position: 'absolute',
                                    cursor: 'pointer',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: aiSettings.aiOcrEnabled ? '#6366f1' : '#444',
                                    transition: '0.4s',
                                    borderRadius: '34px',
                                }}
                            >
                                <span style={{
                                    position: 'absolute',
                                    height: '20px', width: '20px', left: '3px', bottom: '3px',
                                    backgroundColor: 'white', transition: '0.4s', borderRadius: '50%',
                                    transform: aiSettings.aiOcrEnabled ? 'translateX(24px)' : 'translateX(0)'
                                }}></span>
                            </label>
                        </div>
                    </div>
                </div>

                {aiSettings.aiOcrEnabled && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ color: '#aaa', fontSize: '0.9rem' }}>AI Sağlayıcı</label>
                            <select
                                value={aiSettings.aiOcrProvider}
                                onChange={(e) => setAiSettings({ ...aiSettings, aiOcrProvider: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="openai">OpenAI (GPT-4o mini)</option>
                                <option value="gemini">Google Gemini (1.5 Flash)</option>
                                <option value="anthropic">Anthropic Claude (3 Haiku)</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ color: '#aaa', fontSize: '0.9rem' }}>API Anahtarı (API Key)</label>
                            <input
                                type="password"
                                placeholder={user.hasAiApiKey ? "••••••••••••••••" : "API Anahtarınızı girin..."}
                                value={aiSettings.aiOcrApiKey}
                                onChange={(e) => setAiSettings({ ...aiSettings, aiOcrApiKey: e.target.value })}
                                style={inputStyle}
                            />
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '5px' }}>
                                Anahtarınız güvenli bir şekilde şifrelenerek saklanır.
                            </p>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleSaveAI} style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        color: 'white', border: 'none', padding: '10px 25px', borderRadius: '10px',
                        fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: '0.2s'
                    }}>
                        AI Ayarlarını Kaydet
                    </button>
                </div>
            </div>

            {/* SISTEM AYARLARI (Sadece Admin) */}
            {user?.role === 'admin' && (
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>
                        <span style={{ fontSize: '1.5rem' }}>🏢</span> Sistem Ayarları (Admin)
                    </h3>

                    {/* Log Limit */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', color: '#ffc107', marginBottom: '5px', fontWeight: '600' }}>
                            📜 Log Kayıt Limiti (Satır)
                        </label>
                        <input
                            type="number"
                            min="10"
                            value={systemSettings.logRetentionLimit}
                            onChange={(e) => setSystemSettings({ ...systemSettings, logRetentionLimit: parseInt(e.target.value) || 0 })}
                            style={inputStyle}
                        />
                    </div>

                    {/* Trash Retention */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', color: '#dc3545', marginBottom: '5px', fontWeight: '600' }}>
                            🗑️ Çöp Kutusu Saklama Süresi (Gün)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={systemSettings.trashRetentionDays}
                            onChange={(e) => setSystemSettings({ ...systemSettings, trashRetentionDays: parseInt(e.target.value) || 0 })}
                            style={inputStyle}
                        />
                    </div>

                    {/* Public Registration */}
                    <div style={{ marginBottom: '30px', padding: '15px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <label style={{ display: 'block', color: '#4ade80', marginBottom: '5px', fontWeight: '600' }}>
                                    👤 Yeni Kullanıcı Kaydı (Public)
                                </label>
                            </div>
                            <div style={{ position: 'relative', width: '50px', height: '26px' }}>
                                <input
                                    type="checkbox"
                                    checked={systemSettings.allowPublicRegistration}
                                    onChange={(e) => setSystemSettings({ ...systemSettings, allowPublicRegistration: e.target.checked })}
                                    style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                    id="reg-toggle"
                                />
                                <label
                                    htmlFor="reg-toggle"
                                    style={{
                                        position: 'absolute',
                                        cursor: 'pointer',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: systemSettings.allowPublicRegistration ? '#4ade80' : '#444',
                                        transition: '0.4s', borderRadius: '34px',
                                    }}
                                >
                                    <span style={{
                                        position: 'absolute',
                                        height: '20px', width: '20px', left: '3px', bottom: '3px',
                                        backgroundColor: 'white', transition: '0.4s', borderRadius: '50%',
                                        transform: systemSettings.allowPublicRegistration ? 'translateX(24px)' : 'translateX(0)'
                                    }}></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleSaveSystem} style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '10px 25px', borderRadius: '10px',
                            fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', transition: '0.2s'
                        }}>
                            Sistem Ayarlarını Kaydet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;

