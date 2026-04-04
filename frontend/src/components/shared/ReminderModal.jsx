import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCalendarCheck, FaTimes, FaExternalLinkAlt, FaTrashAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';

const ReminderModal = ({ reminders, onClose, onRefresh }) => {
    const { t, i18n } = useTranslation(['pages', 'common']);
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    if (!reminders || reminders.length === 0) return null;

    const handleDismiss = async (id, e) => {
        e.stopPropagation();
        try {
            await api.put(`/api/cards/${id}`, { reminderDate: null });
            showNotification(t('pages:reminder.dismissed'), 'success');
            onRefresh();
        } catch (error) {
            showNotification(t('pages:reminder.error', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    const handleView = (id) => {
        onClose();
        // Here we could navigate to contacts and highlight the card
        // For now, let's just go to contacts or handle it specifically if needed
        navigate('/contacts');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease'
        }}>
            <div style={{
                background: 'var(--bg-card)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '24px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '80vh',
                boxShadow: 'var(--glass-shadow)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                color: 'var(--text-primary)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--glass-bg)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            padding: '10px',
                            background: 'rgba(var(--accent-warning-rgb), 0.2)',
                            borderRadius: '12px',
                            color: 'var(--accent-warning)'
                        }}>
                            <FaCalendarCheck size={24} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>{t('pages:reminder.title')}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--glass-bg)',
                            border: 'none',
                            color: 'var(--text-primary)',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* List Container */}
                <div style={{
                    padding: '12px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {reminders.map(card => (
                            <div
                                key={card.id}
                                onClick={() => handleView(card.id)}
                                style={{
                                    padding: '16px',
                                    background: 'var(--glass-bg)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
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
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '4px' }}>
                                        {card.firstName} {card.lastName}
                                    </div>
                                    <div style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>{card.company}</span>
                                        <span style={{
                                            padding: '2px 8px',
                                            background: 'rgba(var(--accent-warning-rgb), 0.2)',
                                            color: 'var(--accent-warning)',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: '600'
                                        }}>
                                            {(() => {
                                                const d = new Date(card.reminderDate);
                                                return isNaN(d.getTime()) ? t('pages:reminder.invalidDate') : d.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US');
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={(e) => handleDismiss(card.id, e)}
                                        title={t('pages:reminder.dismissTooltip')}
                                        style={{
                                            padding: '8px',
                                            background: 'var(--accent-error-transparent)',
                                            border: 'none',
                                            color: 'var(--accent-error)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--accent-error-rgb), 0.3)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-error-transparent)'}
                                    >
                                        <FaTrashAlt size={16} />
                                    </button>
                                    <button
                                        style={{
                                            padding: '8px',
                                            background: 'var(--accent-primary-transparent)',
                                            border: 'none',
                                            color: 'var(--accent-primary)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <FaExternalLinkAlt size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    background: 'var(--glass-bg)'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-primary)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
                    >
                        {t('common:close')}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ReminderModal;
