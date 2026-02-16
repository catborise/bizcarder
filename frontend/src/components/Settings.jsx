import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const PasswordChangeForm = ({ showNotification }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            showNotification('Yeni şifreler uyuşmuyor.', 'error');
            return;
        }
        if (formData.newPassword.length < 6) {
            showNotification('Yeni şifre en az 6 karakter olmalıdır.', 'error');
            return;
        }

        try {
            const res = await api.put('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            if (res.data.success) {
                showNotification(res.data.message, 'success');
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            showNotification(error.response?.data?.error || 'Şifre değiştirilemedi.', 'error');
        }
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

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#aaa', fontSize: '0.9rem' }}>Mevcut Şifre</label>
                <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                />
            </div>
            <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#aaa', fontSize: '0.9rem' }}>Yeni Şifre</label>
                <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                />
            </div>
            <div style={{ marginBottom: '30px' }}>
                <label style={{ color: '#aaa', fontSize: '0.9rem' }}>Yeni Şifre (Tekrar)</label>
                <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '10px 25px', borderRadius: '10px',
                    fontWeight: '600', cursor: 'pointer'
                }}>Şifreyi Güncelle</button>
            </div>
        </form>
    );
};

const Settings = () => {
    const { user, checkAuth } = useAuth();
    const { showNotification } = useNotification();

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
    const [tags, setTags] = useState([]);
    const [tagForm, setTagForm] = useState({ name: '', color: '#3b82f6' });
    const [profileData, setProfileData] = useState({
        displayName: '',
        email: '',
        trashRetentionDays: 30
    });
    const [editingTag, setEditingTag] = useState(null);
    const [loading, setLoading] = useState(true);

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
                    // Sadece logla
                } else {
                    showNotification('Sistem ayarları yüklenemedi.', 'error');
                }
            } finally {
                setLoading(false);
            }
        };

        const fetchTags = async () => {
            try {
                const res = await api.get('/api/tags');
                setTags(res.data);
            } catch (error) {
                console.error('Tags fetch error:', error);
            }
        };

        if (user) {
            setProfileData({
                displayName: user.displayName || '',
                email: user.email || '',
                trashRetentionDays: user.trashRetentionDays || 30
            });
            setAiSettings({
                aiOcrEnabled: user.aiOcrEnabled || false,
                aiOcrProvider: user.aiOcrProvider || 'openai',
                aiOcrApiKey: ''
            });
            fetchSystemSettings();
            fetchTags();
        }
    }, [user, showNotification]);

    const refreshTags = async () => {
        try {
            const res = await api.get('/api/tags');
            setTags(res.data);
        } catch (error) {
            console.error('Tags fetch error:', error);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const res = await api.put('/auth/profile', profileData);
            if (res.data.success) {
                showNotification('Profil bilgileri başarıyla güncellendi.', 'success');
                await checkAuth();
            }
        } catch (error) {
            console.error('Profile save error:', error);
            showNotification('Profil güncellenemedi: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

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
                await checkAuth();
            }
        } catch (error) {
            console.error('AI Settings save error:', error);
            showNotification('AI ayarları kaydedilemedi: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handleTagSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTag) {
                await api.put(`/api/tags/${editingTag.id}`, tagForm);
                showNotification('Etiket güncellendi.', 'success');
            } else {
                await api.post('/api/tags', tagForm);
                showNotification('Yeni etiket eklendi.', 'success');
            }
            setTagForm({ name: '', color: '#3b82f6' });
            setEditingTag(null);
            refreshTags();
        } catch (error) {
            showNotification('Etiket işlemi başarısız: ' + (error.response?.data?.error || error.message), 'error');
        }
    };

    const handleDeleteTag = async (id) => {
        if (!window.confirm('Bu etiketi silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/api/tags/${id}`);
            showNotification('Etiket silindi.', 'success');
            refreshTags();
        } catch (error) {
            showNotification('Silme başarısız.', 'error');
        }
    };

    if (loading && user?.role === 'admin') return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Yükleniyor...</div>;

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
                marginBottom: '40px', fontWeight: '700', fontSize: '2.5rem',
                color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '15px'
            }}>
                <span style={{ fontSize: '2rem' }}>⚙️</span> Ayarlar
            </h2>

            {/* PROFIL BILGILERI */}
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                    <span style={{ fontSize: '1.5rem' }}>👤</span> Profil Bilgileri
                </h3>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#aaa', fontSize: '0.9rem' }}>Kullanıcı Adı</label>
                    <input
                        type="text"
                        value={user?.username || ''}
                        style={{ ...inputStyle, background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', color: '#888' }}
                        disabled
                    />
                    <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>Kullanıcı adı değiştirilemez.</small>
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#aaa', fontSize: '0.9rem' }}>Ad Soyad / Görünen İsim</label>
                    <input
                        type="text"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                        style={inputStyle}
                        placeholder="İsim giriniz..."
                    />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: '#aaa', fontSize: '0.9rem' }}>E-Posta Adresi</label>
                    <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        style={inputStyle}
                        placeholder="example@mail.com"
                    />
                </div>
                <div style={{ marginBottom: '30px' }}>
                    <label style={{ color: '#aaa', fontSize: '0.9rem' }}>Kişisel Çöp Kutusu Saklama Süresi (Gün)</label>
                    <input
                        type="number"
                        min="1"
                        max="365"
                        value={profileData.trashRetentionDays}
                        onChange={(e) => setProfileData({ ...profileData, trashRetentionDays: parseInt(e.target.value) || 1 })}
                        style={inputStyle}
                    />
                    <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>Sizin tarafınızdan silinen kartların ne kadar süre çöp kutusunda tutulacağını belirler.</small>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleSaveProfile} style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: 'white', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '10px 25px', borderRadius: '10px',
                        fontWeight: '600', cursor: 'pointer'
                    }}>Profili Güncelle</button>
                </div>
            </div>

            {/* HESAP AYARLARI (Şifre Değiştirme) */}
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                    <span style={{ fontSize: '1.5rem' }}>🔐</span> Hesap Ayarları
                </h3>
                {user?.shibbolethId ? (
                    <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#93c5fd' }}>
                        <p style={{ margin: 0 }}>Kurumsal (SSO) hesap ile giriş yaptığınız için şifrenizi organizasyonunuzun portalından değiştirmelisiniz.</p>
                    </div>
                ) : (
                    <PasswordChangeForm showNotification={showNotification} />
                )}
            </div>

            {/* KIŞISEL AI AYARLARI */}
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                    <span style={{ fontSize: '1.5rem' }}>🤖</span> Kişisel AI Ayarları
                </h3>
                <div style={{ marginBottom: '25px', padding: '15px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <label style={{ display: 'block', color: '#818cf8', marginBottom: '5px', fontWeight: '600' }}>AI Destekli OCR</label>
                            <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>Kartvizit tarama işleminde AI modellerini kullanın.</p>
                        </div>
                        <div style={{ position: 'relative', width: '50px', height: '26px' }}>
                            <input
                                type="checkbox"
                                checked={aiSettings.aiOcrEnabled}
                                onChange={(e) => setAiSettings({ ...aiSettings, aiOcrEnabled: e.target.checked })}
                                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                id="ai-toggle"
                            />
                            <label htmlFor="ai-toggle" style={{
                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: aiSettings.aiOcrEnabled ? '#6366f1' : '#444',
                                transition: '0.4s', borderRadius: '34px',
                            }}>
                                <span style={{
                                    position: 'absolute', height: '20px', width: '20px', left: '3px', bottom: '3px',
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
                                <option value="openai">OpenAI</option>
                                <option value="gemini">Google Gemini</option>
                                <option value="anthropic">Anthropic Claude</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ color: '#aaa', fontSize: '0.9rem' }}>API Anahtarı</label>
                            <input
                                type="password"
                                placeholder={user?.hasAiApiKey ? "••••••••••••••••" : "API Anahtarınızı girin..."}
                                value={aiSettings.aiOcrApiKey}
                                onChange={(e) => setAiSettings({ ...aiSettings, aiOcrApiKey: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleSaveAI} style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        color: 'white', border: 'none', padding: '10px 25px', borderRadius: '10px',
                        fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer'
                    }}>AI Ayarlarını Kaydet</button>
                </div>
            </div>


            {/* SISTEM AYARLARI (Admin) */}
            {user?.role === 'admin' && (
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>
                        <span style={{ fontSize: '1.5rem' }}>🏢</span> Sistem Ayarları
                    </h3>
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', color: '#ffc107', marginBottom: '5px', fontWeight: '600' }}>📜 Log Limiti</label>
                        <input
                            type="number"
                            value={systemSettings.logRetentionLimit}
                            onChange={(e) => setSystemSettings({ ...systemSettings, logRetentionLimit: parseInt(e.target.value) || 0 })}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', color: '#dc3545', marginBottom: '5px', fontWeight: '600' }}>🗑️ Çöp Kutusu (Gün)</label>
                        <input
                            type="number"
                            value={systemSettings.trashRetentionDays}
                            onChange={(e) => setSystemSettings({ ...systemSettings, trashRetentionDays: parseInt(e.target.value) || 0 })}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleSaveSystem} style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '10px 25px', borderRadius: '10px',
                            fontWeight: '600', cursor: 'pointer'
                        }}>Sistem Ayarlarını Kaydet</button>
                    </div>
                </div>
            )}

            {/* ETIKET YÖNETIMI */}
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                    <span style={{ fontSize: '1.5rem' }}>🏷️</span> Etiket Yönetimi
                </h3>
                <form onSubmit={handleTagSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '25px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Etiket Adı</label>
                        <input
                            type="text"
                            value={tagForm.name}
                            onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                            style={inputStyle}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Renk</label>
                        <input
                            type="color"
                            value={tagForm.color}
                            onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                            style={{ ...inputStyle, padding: '5px', height: '45px', width: '60px' }}
                        />
                    </div>
                    <button type="submit" style={{
                        background: editingTag ? '#f59e0b' : '#3b82f6',
                        color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '600'
                    }}>{editingTag ? 'Güncelle' : 'Ekle'}</button>
                </form>

                <div style={{ display: 'grid', gap: '10px' }}>
                    {tags.map(tag => (
                        <div key={tag.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: tag.color }}></div>
                                <span>{tag.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { setEditingTag(tag); setTagForm({ name: tag.name, color: tag.color }); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✏️</button>
                                <button onClick={() => handleDeleteTag(tag.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Settings;
