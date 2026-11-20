import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExclamationTriangle } from 'react-icons/fa';

const VARIANT_COLORS = {
    danger: {
        accent: 'var(--accent-error)',
        bg: 'rgba(var(--accent-error-rgb), 0.1)',
    },
    primary: {
        accent: 'var(--accent-primary)',
        bg: 'rgba(var(--accent-primary-rgb), 0.1)',
    },
    success: {
        accent: 'var(--accent-success)',
        bg: 'rgba(var(--accent-success-rgb), 0.1)',
    },
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel, variant = 'danger' }) => {
    const { t } = useTranslation('pages');

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const palette = VARIANT_COLORS[variant] || VARIANT_COLORS.danger;

    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'fadeIn 0.2s ease',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--bg-card)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '20px',
                    padding: '30px',
                    maxWidth: '450px',
                    width: '90%',
                    boxShadow: 'var(--glass-shadow)',
                    animation: 'fadeIn 0.3s ease',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '20px',
                    }}
                >
                    <div
                        style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: palette.bg,
                            border: `2px solid ${palette.accent}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <FaExclamationTriangle size={28} color={palette.accent} />
                    </div>
                </div>

                <h3
                    style={{
                        margin: '0 0 15px 0',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        letterSpacing: '-0.02em',
                    }}
                >
                    {title || t('confirmModal.defaultTitle')}
                </h3>

                <p
                    style={{
                        margin: '0 0 30px 0',
                        fontSize: '1rem',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        lineHeight: '1.5',
                    }}
                >
                    {message || t('confirmModal.defaultMessage')}
                </p>

                <div
                    style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'center',
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(10px)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--glass-bg-hover)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--glass-bg)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {t('common:cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            await onConfirm();
                            onClose();
                        }}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            background: palette.accent,
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            boxShadow: 'var(--glass-shadow)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--glass-shadow-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                        }}
                    >
                        {confirmLabel || t('confirmModal.confirmDelete')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
