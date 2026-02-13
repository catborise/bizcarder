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
            background: 'var(--bg-dark)',
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
                background: 'rgba(30, 41, 59, 0.5)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden'
            }}>
                {/* Header Section */}
                <div style={{
                    padding: '40px 40px 20px',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                        marginBottom: '20px',
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
                    }}>
                        <FaUserLock size={30} color="white" />
                    </div>
                    <h1 style={{
                        margin: 0,
                        fontSize: '1.75rem',
                        color: 'white',
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
                            color: activeTab === 'local' ? '#3b82f6' : 'var(--text-secondary)',
                            border: 'none',
                            borderBottom: activeTab === 'local' ? '2px solid #3b82f6' : '2px solid transparent',
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
                            color: activeTab === 'shibboleth' ? '#3b82f6' : 'var(--text-secondary)',
                            border: 'none',
                            borderBottom: activeTab === 'shibboleth' ? '2px solid #3b82f6' : '2px solid transparent',
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
                            border: `1px solid ${error.includes('başarılı') ? 'rgba(34, 197, 94, 0.2)' : (error.includes('bekliyor') ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)')}`,
                            borderRadius: '12px',
                            color: error.includes('başarılı') ? '#4ade80' : (error.includes('bekliyor') ? '#facc15' : '#fca5a5'),
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
                                    <FaUser style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.3)' }} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 40px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                            color: 'white',
                                            fontSize: '0.925rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
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
                                            <FaEnvelope style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.3)' }} />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 12px 12px 40px',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                                    color: 'white',
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
                                            <FaIdCard style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.3)' }} />
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 12px 12px 40px',
                                                    borderRadius: '12px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                                    color: 'white',
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
                                    <FaKey style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(255,255,255,0.3)' }} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px 12px 12px 40px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                            color: 'white',
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
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                                    opacity: loading ? 0.7 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
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
                                        onMouseEnter={(e) => e.target.style.color = 'white'}
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
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                }}
                            >
                                Shibboleth ile Giriş Yap
                            </button>
                            <p style={{ color: 'rgba(255, 255, 255, 0.4)', marginTop: '20px', fontSize: '0.75rem' }}>
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
