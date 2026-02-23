import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/axios';
import { FaUserLock, FaKey, FaEnvelope, FaUser, FaIdCard } from 'react-icons/fa';

const Login = () => {
    const [activeTab, setActiveTab] = useState('local'); // 'local' or 'shibboleth'
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    // Form states
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [allowRegistration, setAllowRegistration] = useState(true);

    const { loginLocal, registerLocal } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/contacts';

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/config`);
                const data = await res.json();
                setAllowRegistration(data.allowPublicRegistration);
            } catch (err) {
                console.error("Config fetch error:", err);
            }
        };
        fetchConfig();
    }, []);

    const handleLocalSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let result;
            if (isRegisterMode) {
                result = await registerLocal(username, email, password, displayName);

                if (result.success && result.pendingApproval) {
                    setError('Kayıt başarılı. Hesabınız yönetici onayı bekliyor.');
                    setIsRegisterMode(false); // Giriş moduna dön
                    setLoading(false);
                    return;
                }
            } else {
                result = await loginLocal(username, password);
            }

            if (result.success) {
                navigate(from, { replace: true });
            } else {
                setError(result.error || 'İşlem başarısız.');
            }
        } catch (err) {
            setError('Bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const handleShibbolethLogin = () => {
        // Shibboleth SAML akışını başlat
        window.location.href = `${API_URL}/auth/login`;
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main)',
            backgroundImage: `
                radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.1) 0%, transparent 40%),
                radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.1) 0%, transparent 40%)
            `,
            backgroundAttachment: 'fixed',
            padding: '20px'
        }}>

            <div className="fade-in" style={{
                width: '100%',
                maxWidth: '440px',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                overflow: 'hidden'
            }}>

                {/* Header Section */}
                <div style={{
                    padding: '40px 40px 20px',
                    textAlign: 'center',
                    borderBottom: '1px solid var(--glass-border)'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'var(--accent-primary)',
                        marginBottom: '20px',
                        boxShadow: 'var(--glass-shadow-hover)'
                    }}>
                        <FaUserLock size={30} color="var(--bg-card)" />
                    </div>
                    <h1 style={{
                        margin: 0,
                        fontSize: '1.75rem',
                        color: 'var(--text-primary)',
                        fontWeight: '700',
                        letterSpacing: '-0.025em'
                    }}>
                        CRM Giriş
                    </h1>
                    <p style={{
                        margin: '10px 0 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.925rem'
                    }}>
                        Devam etmek için oturum açın
                    </p>
                </div>


                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    padding: '10px 40px 0',
                    gap: '20px'
                }}>
                    <button
                        onClick={() => { setActiveTab('local'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '12px 0',
                            backgroundColor: 'transparent',
                            color: activeTab === 'local' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: 'none',
                            borderBottom: activeTab === 'local' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        Yerel Giriş
                    </button>
                    <button
                        onClick={() => { setActiveTab('shibboleth'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '12px 0',
                            backgroundColor: 'transparent',
                            color: activeTab === 'shibboleth' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: 'none',
                            borderBottom: activeTab === 'shibboleth' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        Shibboleth
                    </button>
                </div>


                {/* Main Content Area */}
                <div style={{ padding: '40px' }}>
                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            marginBottom: '24px',
                            backgroundColor: error.includes('başarılı') ? 'rgba(34, 197, 94, 0.1)' : (error.includes('bekliyor') ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                            border: `1px solid ${error.includes('başarılı') ? 'var(--accent-success)' : (error.includes('bekliyor') ? 'var(--accent-warning)' : 'var(--accent-error)')}`,
                            borderRadius: '12px',
                            color: error.includes('başarılı') ? 'var(--accent-success)' : (error.includes('bekliyor') ? 'var(--accent-warning)' : 'var(--accent-error)'),
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>{error}</span>
                        </div>
                    )}


                    {activeTab === 'local' ? (
                        <form onSubmit={handleLocalSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>
                                    Kullanıcı Adı {isRegisterMode && 'veya E-posta'}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <FaUser style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-tertiary)' }} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 40px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.925rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                                        placeholder={isRegisterMode ? "kullaniciadi" : "kullaniciadi veya email"}
                                    />
                                </div>

                            </div>

                            {isRegisterMode && (
                                <>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>
                                            E-posta
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <FaEnvelope style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-tertiary)' }} />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 12px 12px 40px',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--glass-border)',
                                                    backgroundColor: 'var(--bg-input)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.925rem',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                                placeholder="ornek@email.com"
                                            />
                                        </div>

                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>
                                            Görünen Ad (Opsiyonel)
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <FaIdCard style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-tertiary)' }} />
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 12px 12px 40px',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--glass-border)',
                                                    backgroundColor: 'var(--bg-input)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.925rem',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                                placeholder="Adınız Soyadınız"
                                            />
                                        </div>

                                    </div>
                                </>
                            )}

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>
                                    Şifre
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <FaKey style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-tertiary)' }} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 40px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.925rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        placeholder="••••••••"
                                    />
                                </div>

                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'var(--accent-primary)',
                                    color: 'var(--bg-card)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: 'var(--glass-shadow)',
                                    opacity: loading ? 0.7 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = 'var(--glass-shadow-hover)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                                    }
                                }}
                            >
                                {loading ? 'İşleniyor...' : (isRegisterMode ? 'Hesap Oluştur' : 'Giriş Yap')}
                            </button>

                            {allowRegistration && (
                                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRegisterMode(!isRegisterMode);
                                            setError('');
                                            setUsername('');
                                            setEmail('');
                                            setPassword('');
                                            setDisplayName('');
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.825rem',
                                            cursor: 'pointer',
                                            transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                                        onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                                    >
                                        {isRegisterMode ? 'Zaten hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Yeni kayıt oluşturun'}
                                    </button>

                                </div>
                            )}
                        </form>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.925rem', lineHeight: '1.6' }}>
                                Kurumsal kimlik bilgilerinizle güvenli geçiş yapmak için Shibboleth servisini kullanın.
                            </p>
                            <button
                                onClick={handleShibbolethLogin}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'var(--glass-bg)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--glass-bg-hover)';
                                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--glass-bg)';
                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                }}
                            >
                                Shibboleth ile Giriş Yap
                            </button>

                            <p style={{ color: 'var(--text-tertiary)', marginTop: '20px', fontSize: '0.75rem' }}>
                                Kurumsal kimlik sağlayıcısına yönlendirileceksiniz.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
