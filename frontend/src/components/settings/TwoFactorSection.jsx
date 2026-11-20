import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { resolveApiError, resolveApiMessage } from '../../utils/apiError';

const inputStyle = {
    width: '100%',
    padding: '12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '1.1rem',
    letterSpacing: '0.3em',
    textAlign: 'center',
    marginTop: '8px',
};

const TwoFactorSection = () => {
    const { t } = useTranslation(['settings', 'common']);
    const { user, checkAuth } = useAuth();
    const { showNotification } = useNotification();

    const [setupData, setSetupData] = useState(null); // { qrCodeUrl, secret }
    const [token, setToken] = useState('');
    const [showDisableForm, setShowDisableForm] = useState(false);
    const [loading, setLoading] = useState(false);

    const isEnabled = !!user?.twoFactorEnabled;

    const handleStartSetup = async () => {
        setLoading(true);
        try {
            const res = await api.post('/api/2fa/setup');
            setSetupData(res.data);
            setToken('');
        } catch (error) {
            showNotification(resolveApiError(error, 'settings:twoFactor.setupFailed'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndEnable = async (e) => {
        e.preventDefault();
        if (token.length !== 6) return;
        setLoading(true);
        try {
            const res = await api.post('/api/2fa/verify', { token });
            showNotification(resolveApiMessage(res.data, 'settings:twoFactor.enabled'), 'success');
            setSetupData(null);
            setToken('');
            await checkAuth();
        } catch (error) {
            showNotification(resolveApiError(error, 'settings:twoFactor.verifyFailed'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async (e) => {
        e.preventDefault();
        if (token.length !== 6) return;
        setLoading(true);
        try {
            const res = await api.post('/api/2fa/disable', { token });
            showNotification(resolveApiMessage(res.data, 'settings:twoFactor.disabled'), 'success');
            setShowDisableForm(false);
            setToken('');
            await checkAuth();
        } catch (error) {
            showNotification(resolveApiError(error, 'settings:twoFactor.disableFailed'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '15px',
                    background: 'var(--glass-bg)',
                    borderRadius: '12px',
                    border: `1px solid ${isEnabled ? 'var(--accent-success)' : 'var(--glass-border)'}`,
                    marginBottom: '20px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isEnabled ? (
                        <FaCheckCircle size={22} color="var(--accent-success)" />
                    ) : (
                        <FaShieldAlt size={22} color="var(--text-tertiary)" />
                    )}
                    <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {isEnabled ? t('settings:twoFactor.statusEnabled') : t('settings:twoFactor.statusDisabled')}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                            {t('settings:twoFactor.description')}
                        </p>
                    </div>
                </div>

                {!isEnabled && !setupData && (
                    <button
                        type="button"
                        onClick={handleStartSetup}
                        disabled={loading}
                        style={{
                            background: 'var(--accent-primary)',
                            color: 'var(--bg-card)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 18px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? t('common:processing') : t('settings:twoFactor.enableBtn')}
                    </button>
                )}

                {isEnabled && !showDisableForm && (
                    <button
                        type="button"
                        onClick={() => {
                            setShowDisableForm(true);
                            setToken('');
                        }}
                        style={{
                            background: 'var(--accent-error-transparent)',
                            color: 'var(--accent-error)',
                            border: '1px solid var(--accent-error)',
                            borderRadius: '10px',
                            padding: '10px 18px',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        {t('settings:twoFactor.disableBtn')}
                    </button>
                )}
            </div>

            {setupData && !isEnabled && (
                <form onSubmit={handleVerifyAndEnable} className="fade-in">
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '20px',
                            background: 'var(--bg-input)',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)',
                            marginBottom: '20px',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                textAlign: 'center',
                            }}
                        >
                            {t('settings:twoFactor.scanQrHint')}
                        </p>
                        <img
                            src={setupData.qrCodeUrl}
                            alt="2FA QR Code"
                            style={{
                                width: '180px',
                                height: '180px',
                                borderRadius: '12px',
                                background: '#fff',
                                padding: '8px',
                            }}
                        />
                        <div style={{ width: '100%', textAlign: 'center' }}>
                            <small style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>
                                {t('settings:twoFactor.manualKeyLabel')}
                            </small>
                            <code
                                style={{
                                    display: 'inline-block',
                                    padding: '8px 14px',
                                    background: 'var(--bg-card)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    letterSpacing: '0.1em',
                                    wordBreak: 'break-all',
                                }}
                            >
                                {setupData.secret}
                            </code>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label
                            htmlFor="twofactor-verify-token"
                            style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}
                        >
                            {t('settings:twoFactor.codeLabel')}
                        </label>
                        <input
                            id="twofactor-verify-token"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={token}
                            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            style={inputStyle}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setSetupData(null);
                                setToken('');
                            }}
                            style={{
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '10px',
                                padding: '10px 18px',
                                cursor: 'pointer',
                            }}
                        >
                            {t('common:cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || token.length !== 6}
                            style={{
                                background: 'var(--accent-success)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 20px',
                                fontWeight: '600',
                                cursor: loading || token.length !== 6 ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? t('common:processing') : t('settings:twoFactor.verifyBtn')}
                        </button>
                    </div>
                </form>
            )}

            {showDisableForm && isEnabled && (
                <form onSubmit={handleDisable} className="fade-in">
                    <div style={{ marginBottom: '20px' }}>
                        <label
                            htmlFor="twofactor-disable-token"
                            style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}
                        >
                            {t('settings:twoFactor.disableCodeLabel')}
                        </label>
                        <input
                            id="twofactor-disable-token"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={token}
                            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            style={inputStyle}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setShowDisableForm(false);
                                setToken('');
                            }}
                            style={{
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '10px',
                                padding: '10px 18px',
                                cursor: 'pointer',
                            }}
                        >
                            {t('common:cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || token.length !== 6}
                            style={{
                                background: 'var(--accent-error)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 20px',
                                fontWeight: '600',
                                cursor: loading || token.length !== 6 ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? t('common:processing') : t('settings:twoFactor.confirmDisableBtn')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default TwoFactorSection;
