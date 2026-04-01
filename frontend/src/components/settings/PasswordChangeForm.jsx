import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';

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

const PasswordChangeForm = () => {
    const { t } = useTranslation('settings');
    const { showNotification } = useNotification();

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
            showNotification(t('password.mismatch'), 'error');
            return;
        }
        if (formData.newPassword.length < 6) {
            showNotification(t('password.tooShort'), 'error');
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
            showNotification(error.response?.data?.error || t('password.changeFailed'), 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('password.currentLabel')}</label>
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
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('password.newLabel')}</label>
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
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('password.confirmLabel')}</label>
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
                <button
                    type="submit"
                    style={{
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-card)',
                        border: 'none',
                        padding: '12px 25px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: 'var(--glass-shadow)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {t('password.updateBtn')}
                </button>
            </div>
        </form>
    );
};

export default PasswordChangeForm;
