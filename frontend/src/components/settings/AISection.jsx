import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
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

const AISection = () => {
    const { t } = useTranslation('settings');
    const { showNotification } = useNotification();
    const { user, checkAuth } = useAuth();

    const [aiSettings, setAiSettings] = useState({
        aiOcrEnabled: false,
        aiOcrProvider: 'openai',
        aiOcrApiKey: '',
    });

    useEffect(() => {
        if (user) {
            setAiSettings({
                aiOcrEnabled: user.aiOcrEnabled || false,
                aiOcrProvider: user.aiOcrProvider || 'openai',
                aiOcrApiKey: '',
            });
        }
    }, [user]);

    const handleSaveAI = async () => {
        try {
            const res = await api.put('/auth/profile', aiSettings);
            if (res.data.success) {
                showNotification(t('notify.aiUpdated'), 'success');
                await checkAuth();
            }
        } catch (error) {
            console.error('AI Settings save error:', error);
            showNotification(
                t('notify.aiSaveFailed', { error: error.response?.data?.error || error.message }),
                'error',
            );
        }
    };

    return (
        <div>
            <div
                style={{
                    marginBottom: '25px',
                    padding: '15px',
                    background: 'var(--glass-bg)',
                    borderRadius: '12px',
                    border: '1px solid var(--accent-primary)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                color: 'var(--accent-primary)',
                                marginBottom: '5px',
                                fontWeight: '600',
                            }}
                        >
                            {t('ai.ocrLabel')}
                        </label>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', margin: 0 }}>
                            {t('ai.ocrDescription')}
                        </p>
                    </div>
                    <div style={{ position: 'relative', width: '50px', height: '26px' }}>
                        <input
                            type="checkbox"
                            checked={aiSettings.aiOcrEnabled}
                            onChange={(e) => setAiSettings({ ...aiSettings, aiOcrEnabled: e.target.checked })}
                            style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                            id="ai-toggle"
                        />
                        <label
                            htmlFor="ai-toggle"
                            style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: aiSettings.aiOcrEnabled ? 'var(--accent-primary)' : 'var(--bg-input)',
                                transition: '0.4s',
                                borderRadius: '34px',
                            }}
                        >
                            <span
                                style={{
                                    position: 'absolute',
                                    height: '20px',
                                    width: '20px',
                                    left: '3px',
                                    bottom: '3px',
                                    backgroundColor: 'white',
                                    transition: '0.4s',
                                    borderRadius: '50%',
                                    transform: aiSettings.aiOcrEnabled ? 'translateX(24px)' : 'translateX(0)',
                                }}
                            ></span>
                        </label>
                    </div>
                </div>
            </div>

            {aiSettings.aiOcrEnabled && (
                <div className="fade-in">
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {t('ai.providerLabel')}
                        </label>
                        <select
                            value={aiSettings.aiOcrProvider}
                            onChange={(e) => setAiSettings({ ...aiSettings, aiOcrProvider: e.target.value })}
                            style={inputStyle}
                        >
                            <option value="openai">OpenAI</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="anthropic">Anthropic Claude</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {t('ai.apiKeyLabel')}
                        </label>
                        <input
                            type="password"
                            placeholder={user?.hasAiApiKey ? '••••••••••••••••' : t('ai.apiKeyPlaceholder')}
                            value={aiSettings.aiOcrApiKey}
                            onChange={(e) => setAiSettings({ ...aiSettings, aiOcrApiKey: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSaveAI}
                    style={{
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: 'var(--glass-shadow)',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {t('ai.saveBtn')}
                </button>
            </div>
        </div>
    );
};

export default AISection;
