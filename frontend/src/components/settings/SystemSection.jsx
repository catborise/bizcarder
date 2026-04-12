import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api, { API_URL } from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const inputStyle = {
    width: '100%',
    padding: '12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    marginTop: '8px',
};

const SystemSection = () => {
    const { t } = useTranslation('settings');
    const { showNotification } = useNotification();
    const { user } = useAuth();

    const [systemSettings, setSystemSettings] = useState({
        logRetentionLimit: 1000,
        trashRetentionDays: 30,
        allowPublicRegistration: true,
        developerName: 'Muhammet Sağ',
        developerEmail: 'm.sag@catborise.com',
        developerGithub: 'https://github.com/catborise/bizcarder',
        developerLinkedin: '',
        companyName: 'BizCarder',
        companyLogo: '',
        companyIcon: '',
        appBanner: '',
        footerText: '© 2026 BizCarder. Tüm Hakları Saklıdır.',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role !== 'admin') {
            setLoading(false);
            return;
        }
        const fetchSystemSettings = async () => {
            try {
                const res = await api.get('/api/settings');
                setSystemSettings(res.data);
            } catch (error) {
                console.error('Settings fetch error:', error);
                if (!error.response || error.response.status !== 403) {
                    showNotification(t('notify.systemLoadFailed'), 'error');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSystemSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleSaveSystem = async () => {
        try {
            await api.put('/api/settings', systemSettings);
            showNotification(t('notify.systemUpdated'), 'success');
        } catch (error) {
            console.error('Settings save error:', error);
            showNotification(t('notify.saveFailed', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    const handleBrandingUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            showNotification(t('notify.uploading'), 'info');
            const res = await api.post('/api/settings/upload-branding', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSystemSettings((prev) => ({ ...prev, [field]: res.data.url }));
            showNotification(t('notify.uploaded'), 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showNotification(t('notify.uploadFailed'), 'error');
        }
    };

    if (loading) {
        return null;
    }

    return (
        <div>
            <div style={{ marginBottom: '25px' }}>
                <label
                    style={{ display: 'block', color: 'var(--accent-warning)', marginBottom: '5px', fontWeight: '600' }}
                >
                    📜 {t('system.logLimit')}
                </label>
                <input
                    type="number"
                    value={systemSettings.logRetentionLimit}
                    onChange={(e) =>
                        setSystemSettings({ ...systemSettings, logRetentionLimit: parseInt(e.target.value) || 0 })
                    }
                    style={inputStyle}
                />
            </div>

            <div style={{ marginBottom: '30px' }}>
                <label
                    style={{ display: 'block', color: 'var(--accent-error)', marginBottom: '5px', fontWeight: '600' }}
                >
                    🗑️ {t('system.trashRetention')}
                </label>
                <input
                    type="number"
                    value={systemSettings.trashRetentionDays}
                    onChange={(e) =>
                        setSystemSettings({ ...systemSettings, trashRetentionDays: parseInt(e.target.value) || 0 })
                    }
                    style={inputStyle}
                />
            </div>

            {/* Developer Info */}
            <div style={{ marginBottom: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                <h4
                    style={{
                        color: 'var(--text-primary)',
                        marginBottom: '20px',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    👨‍💻 {t('section.aboutDeveloper')}
                </h4>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {t('system.developerName')}
                    </label>
                    <input
                        type="text"
                        value={systemSettings.developerName}
                        onChange={(e) => setSystemSettings({ ...systemSettings, developerName: e.target.value })}
                        style={inputStyle}
                        placeholder={t('system.devNamePlaceholder')}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {t('system.developerEmail')}
                    </label>
                    <input
                        type="email"
                        value={systemSettings.developerEmail}
                        onChange={(e) => setSystemSettings({ ...systemSettings, developerEmail: e.target.value })}
                        style={inputStyle}
                        placeholder={t('system.devEmailPlaceholder')}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {t('system.githubUrl')}
                    </label>
                    <input
                        type="text"
                        value={systemSettings.developerGithub}
                        onChange={(e) => setSystemSettings({ ...systemSettings, developerGithub: e.target.value })}
                        style={inputStyle}
                        placeholder="https://github.com/..."
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {t('system.linkedinUrl')}
                    </label>
                    <input
                        type="text"
                        value={systemSettings.developerLinkedin}
                        onChange={(e) => setSystemSettings({ ...systemSettings, developerLinkedin: e.target.value })}
                        style={inputStyle}
                        placeholder="https://linkedin.com/in/..."
                    />
                </div>
            </div>

            {/* Branding */}
            <div style={{ marginBottom: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                <h4
                    style={{
                        color: 'var(--text-primary)',
                        marginBottom: '20px',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    🎨 {t('section.branding')}
                </h4>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {t('system.companyName')}
                    </label>
                    <input
                        type="text"
                        value={systemSettings.companyName}
                        onChange={(e) => setSystemSettings({ ...systemSettings, companyName: e.target.value })}
                        style={inputStyle}
                        placeholder="BizCarder"
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    {/* Logo Upload */}
                    <div>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {t('system.companyLogo')}
                        </label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                            {systemSettings.companyLogo && (
                                <div
                                    style={{
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-card)',
                                        padding: '4px',
                                        border: '1px solid var(--glass-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <img
                                        src={`${API_URL}${systemSettings.companyLogo}`}
                                        alt="Logo"
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleBrandingUpload(e, 'companyLogo')}
                                style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                            />
                        </div>
                    </div>

                    {/* Icon / Favicon Upload */}
                    <div>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {t('system.companyIcon')}
                        </label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                            {systemSettings.companyIcon && (
                                <div
                                    style={{
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '8px',
                                        background: 'var(--bg-card)',
                                        padding: '4px',
                                        border: '1px solid var(--glass-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <img
                                        src={`${API_URL}${systemSettings.companyIcon}`}
                                        alt="Icon"
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleBrandingUpload(e, 'companyIcon')}
                                style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {t('system.appBanner')}
                    </label>
                    <div style={{ marginTop: '8px' }}>
                        {systemSettings.appBanner && (
                            <div
                                style={{
                                    width: '100%',
                                    height: '100px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    marginBottom: '10px',
                                    border: '1px solid var(--glass-border)',
                                }}
                            >
                                <img
                                    src={`${API_URL}${systemSettings.appBanner}`}
                                    alt="Banner"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleBrandingUpload(e, 'appBanner')}
                            style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {t('system.footerText')}
                    </label>
                    <input
                        type="text"
                        value={systemSettings.footerText}
                        onChange={(e) => setSystemSettings({ ...systemSettings, footerText: e.target.value })}
                        style={inputStyle}
                        placeholder={t('system.footerPlaceholder')}
                    />
                    <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                        {t('system.footerHint')}
                    </small>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSaveSystem}
                    style={{
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-card)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: 'var(--glass-shadow)',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {t('system.saveBtn')}
                </button>
            </div>
        </div>
    );
};

export default SystemSection;
