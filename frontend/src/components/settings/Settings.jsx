import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import PasswordChangeForm from './PasswordChangeForm';
import AISection from './AISection';
import SystemSection from './SystemSection';
import TagManagement from './TagManagement';

const Settings = () => {
    const { t } = useTranslation(['settings', 'common']);
    const { user, checkAuth } = useAuth();
    const { showNotification } = useNotification();

    const [profileData, setProfileData] = useState({
        displayName: '',
        email: '',
        trashRetentionDays: 30
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                displayName: user.displayName || '',
                email: user.email || '',
                trashRetentionDays: user.trashRetentionDays || 30
            });
        }
    }, [user]);

    const handleSaveProfile = async () => {
        try {
            const res = await api.put('/auth/profile', profileData);
            if (res.data.success) {
                showNotification(t('settings:notify.profileUpdated'), 'success');
                await checkAuth();
            }
        } catch (error) {
            console.error('Profile save error:', error);
            showNotification(t('settings:notify.profileUpdateFailed', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    const cardStyle = {
        background: 'var(--bg-card)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '30px',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        maxWidth: '700px',
        marginBottom: '30px'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        background: 'var(--bg-input)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        fontSize: '1rem',
        marginTop: '8px'
    };

    const sectionTitleStyle = {
        marginBottom: '20px',
        fontWeight: '700',
        fontSize: '1.8rem',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '50px' }}>
            <h2 style={{
                marginBottom: '40px', fontWeight: '700', fontSize: '2.5rem',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '15px'
            }}>
                <span style={{ fontSize: '2rem' }}>⚙️</span> {t('settings:title')}
            </h2>

            {/* PROFILE */}
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                    <span style={{ fontSize: '1.5rem' }}>👤</span> {t('settings:section.profile')}
                </h3>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('settings:profile.username')}</label>
                    <input
                        type="text"
                        value={user?.username || ''}
                        style={{ ...inputStyle, background: 'var(--bg-input)', opacity: 0.6, cursor: 'not-allowed', color: 'var(--text-tertiary)' }}
                        disabled
                    />
                    <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>{t('settings:profile.usernameHint')}</small>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('settings:profile.displayName')}</label>
                    <input
                        type="text"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                        style={inputStyle}
                        placeholder={t('settings:profile.displayNamePlaceholder')}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('settings:profile.email')}</label>
                    <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        style={inputStyle}
                        placeholder="example@mail.com"
                    />
                </div>

                <div style={{ marginBottom: '30px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('settings:profile.trashRetention')}</label>
                    <input
                        type="number"
                        min="1"
                        max="365"
                        value={profileData.trashRetentionDays}
                        onChange={(e) => setProfileData({ ...profileData, trashRetentionDays: parseInt(e.target.value) || 1 })}
                        style={inputStyle}
                    />
                    <small style={{ color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>{t('settings:profile.trashRetentionHint')}</small>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleSaveProfile}
                        style={{
                            background: 'var(--accent-primary)',
                            color: 'var(--bg-card)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 24px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: 'var(--glass-shadow)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {t('settings:profile.updateBtn')}
                    </button>
                </div>
            </div>

            {/* PASSWORD CHANGE */}
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                    <span style={{ fontSize: '1.5rem' }}>🔐</span> {t('settings:section.account')}
                </h3>
                {user?.shibbolethId ? (
                    <div style={{ padding: '15px', background: 'var(--glass-bg)', borderRadius: '8px', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                        <p style={{ margin: 0 }}>{t('settings:account.ssoMessage')}</p>
                    </div>
                ) : (
                    <PasswordChangeForm />
                )}
            </div>

            {/* AI OCR SETTINGS */}
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                    <span style={{ fontSize: '1.5rem' }}>🤖</span> {t('settings:section.ai')}
                </h3>
                <AISection />
            </div>

            {/* TAG MANAGEMENT */}
            <div style={cardStyle}>
                <h3 style={sectionTitleStyle}>
                    <span style={{ fontSize: '1.5rem' }}>🏷️</span> {t('settings:section.tags')}
                </h3>
                <TagManagement />
            </div>

            {/* SYSTEM SETTINGS (admin only) */}
            {user?.role === 'admin' && (
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>
                        <span style={{ fontSize: '1.5rem' }}>🏢</span> {t('settings:section.system')}
                    </h3>
                    <SystemSection />
                </div>
            )}
        </div>
    );
};

export default Settings;
