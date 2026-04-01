import React from 'react';
import Modal from '../shared/Modal';

export default function DuplicateAlertModal({ isOpen, onClose, duplicateCard, onUpdateExisting, onCreateAnyway, t }) {
    if (!duplicateCard) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('addCard.duplicate.title')}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '70px',
                    height: '70px',
                    background: 'rgba(255, 193, 7, 0.15)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '2rem'
                }}>
                    ⚠️
                </div>

                <p
                    style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '25px', marginTop: 0 }}
                    dangerouslySetInnerHTML={{
                        __html: t('addCard.duplicate.description', {
                            firstName: duplicateCard.firstName,
                            lastName: duplicateCard.lastName
                        }).replace('<1>', '<b>').replace('</1>', '</b>')
                    }}
                />

                <div style={{
                    background: 'var(--glass-bg)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '30px',
                    textAlign: 'left',
                    border: '1px solid var(--glass-border)'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>{t('addCard.duplicate.company')}</span>
                        <span>{duplicateCard.company || '-'}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>{t('addCard.duplicate.email')}</span>
                        <span>{duplicateCard.email || '-'}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>{t('addCard.duplicate.addedBy')}</span>
                        <span style={{ color: 'var(--accent-success)' }}>@{duplicateCard.owner?.displayName || 'Sistem'}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        type="button"
                        onClick={onUpdateExisting}
                        style={{
                            padding: '14px',
                            background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)',
                            color: 'var(--bg-card)',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            boxShadow: 'var(--glass-shadow)'
                        }}
                    >
                        {t('addCard.btn.updateExisting')}
                    </button>
                    <button
                        type="button"
                        onClick={onCreateAnyway}
                        style={{
                            padding: '12px',
                            background: 'var(--glass-bg)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        {t('addCard.btn.createAnyway')}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            color: 'var(--text-tertiary)',
                            border: 'none',
                            padding: '5px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            marginTop: '5px',
                            textDecoration: 'underline'
                        }}
                    >
                        {t('addCard.btn.cancelAction')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
