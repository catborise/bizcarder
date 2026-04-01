import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';

const inputStyle = {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--glass-shadow)',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s ease',
    width: '100%',
    boxSizing: 'border-box'
};

const labelStyle = {
    color: 'var(--accent-warning)',
    fontSize: '0.8rem',
    fontWeight: 'bold'
};

export default function OcrConfirmModal({ isOpen, onClose, ocrResults, onConfirm, t }) {
    const [fields, setFields] = useState({
        firstName: '',
        lastName: '',
        company: '',
        title: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        ocrText: ''
    });

    // Sync local fields when ocrResults changes (new scan)
    useEffect(() => {
        if (ocrResults) {
            setFields({
                firstName: ocrResults.firstName || '',
                lastName: ocrResults.lastName || '',
                company: ocrResults.company || '',
                title: ocrResults.title || '',
                email: ocrResults.email || '',
                phone: ocrResults.phone || '',
                website: ocrResults.website || '',
                address: ocrResults.address || '',
                ocrText: ocrResults.ocrText || ''
            });
        }
    }, [ocrResults]);

    const handleChange = (field) => (e) => {
        setFields(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleFocus = (e) => {
        e.target.style.background = 'var(--glass-bg-hover)';
        e.target.style.borderColor = 'var(--accent-primary)';
    };

    const handleBlur = (e) => {
        e.target.style.background = 'var(--bg-card)';
        e.target.style.borderColor = 'var(--glass-border)';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`\uD83D\uDD0D ${t('addCard.ocrConfirm.title')}`}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '25px', marginTop: 0 }}>
                {t('addCard.ocrConfirm.description')}
            </p>

            <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
                <div className="addcard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={labelStyle}>{t('addCard.ocrLabel.firstName')}</label>
                        <input
                            type="text"
                            value={fields.firstName}
                            onChange={handleChange('firstName')}
                            style={inputStyle}
                            placeholder={t('addCard.placeholder.firstName')}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={labelStyle}>{t('addCard.ocrLabel.lastName')}</label>
                        <input
                            type="text"
                            value={fields.lastName}
                            onChange={handleChange('lastName')}
                            style={inputStyle}
                            placeholder={t('addCard.placeholder.lastName')}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>
                </div>

                <div className="addcard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={labelStyle}>{t('addCard.ocrLabel.company')}</label>
                        <input
                            type="text"
                            value={fields.company}
                            onChange={handleChange('company')}
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={labelStyle}>{t('addCard.ocrLabel.title')}</label>
                        <input
                            type="text"
                            value={fields.title}
                            onChange={handleChange('title')}
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>
                </div>

                <div className="addcard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={labelStyle}>{t('addCard.ocrLabel.email')}</label>
                        <input
                            type="text"
                            value={fields.email}
                            onChange={handleChange('email')}
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={labelStyle}>{t('addCard.ocrLabel.phone')}</label>
                        <input
                            type="text"
                            value={fields.phone}
                            onChange={handleChange('phone')}
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={labelStyle}>{t('addCard.ocrLabel.website')}</label>
                    <input
                        type="text"
                        value={fields.website}
                        onChange={handleChange('website')}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={labelStyle}>{t('addCard.ocrLabel.address')}</label>
                    <textarea
                        value={fields.address}
                        onChange={handleChange('address')}
                        style={{ ...inputStyle, minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                </div>
            </div>

            <div className="ocr-confirm-buttons" style={{ display: 'flex', gap: '15px' }}>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: 'var(--glass-bg)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    {t('common:cancel')}
                </button>
                <button
                    type="button"
                    onClick={() => onConfirm(fields)}
                    style={{
                        flex: 2,
                        padding: '12px',
                        background: 'linear-gradient(135deg, var(--accent-success) 0%, #22c55e 100%)',
                        color: 'var(--bg-card)',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        boxShadow: 'var(--glass-shadow)'
                    }}
                >
                    {t('addCard.btn.confirmAndApply')}
                </button>
            </div>
        </Modal>
    );
}
