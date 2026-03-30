import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const currentLang = i18n.language;

    const toggle = () => {
        i18n.changeLanguage(currentLang === 'tr' ? 'en' : 'tr');
    };

    return (
        <button
            onClick={toggle}
            title={currentLang === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '10px',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
                whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.background = 'var(--glass-bg-hover)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.background = 'var(--glass-bg)';
            }}
        >
            <span style={{ fontSize: '15px' }}>{currentLang === 'tr' ? '🇹🇷' : '🇬🇧'}</span>
            <span>{currentLang.toUpperCase()}</span>
        </button>
    );
};

export default LanguageSwitcher;
