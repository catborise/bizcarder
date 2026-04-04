import React from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation, Trans } from 'react-i18next';
import { FaShieldAlt, FaHome, FaEnvelope } from 'react-icons/fa';

const AccessDenied = () => {
    const { t } = useTranslation('pages');
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const message = params.get('message') || t('accessDenied.defaultMessage');

    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div className="fade-in" style={{
                maxWidth: '550px',
                width: '100%',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid var(--glass-border)',
                padding: '50px 40px',
                textAlign: 'center',
                boxShadow: 'var(--glass-shadow)'
            }}>
                <div style={{
                    width: '100px',
                    height: '100px',
                    background: 'rgba(var(--accent-error-rgb), 0.1)',
                    borderRadius: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 30px',
                    border: '1px solid var(--accent-error)'
                }}>
                    <FaShieldAlt size={50} color="var(--accent-error)" />
                </div>

                <h1 style={{
                    color: 'var(--text-primary)',
                    fontSize: '2rem',
                    fontWeight: '800',
                    marginBottom: '15px',
                    letterSpacing: '-0.025em'
                }}>
                    {t('accessDenied.title')}
                </h1>

                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '1.1rem',
                    lineHeight: '1.6',
                    marginBottom: '40px'
                }}>
                    {message}
                    <br />
                    <span style={{ fontSize: '0.9rem', marginTop: '10px', display: 'block', opacity: 0.8 }}>
                        {t('accessDenied.orgNotDefined')}
                    </span>
                </p>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <Link to="/" style={{
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-card)',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '0.95rem'
                    }}>
                        <FaHome /> {t('accessDenied.goHome')}
                    </Link>

                    <Link to="/about" style={{
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'var(--glass-bg)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '0.95rem'
                    }}>
                        <FaEnvelope /> {t('accessDenied.getSupport')}
                    </Link>
                </div>

                <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--glass-border)' }}>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        <Trans i18nKey="accessDenied.switchAccountHint" ns="pages">
                            Farklı bir hesapla giris yapmak istiyorsaniz <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>buraya tiklayarak</Link> giris sayfasina donebilirsiniz.
                        </Trans>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;
