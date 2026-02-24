import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../api/axios';
import { FaUserLock, FaKey, FaEnvelope, FaUser, FaIdCard } from 'react-icons/fa';

const Login = () => {
    const [showLocalForm, setShowLocalForm] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    // Form states
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [allowRegistration, setAllowRegistration] = useState(true);
    const [samlEnabled, setSamlEnabled] = useState(true);
    const [branding, setBranding] = useState({
        companyName: 'BizCarder',
        companyLogo: ''
    });

    const { loginLocal, registerLocal } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/contacts';

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // auth/config yerine artık /api/settings kullanıyoruz (branding dahil)
                const res = await api.get('/api/settings');
                const data = res.data;

                setAllowRegistration(data.allowPublicRegistration !== false);
                setSamlEnabled(data.samlEnabled !== false);
                setBranding({
                    companyName: data.companyName || 'BizCarder',
                    companyLogo: data.companyLogo || ''
                });

                if (data.samlEnabled === false) {
                    setShowLocalForm(true);
                }
            } catch (err) {
                console.error("Config fetch error:", err);
            }
        };
        fetchConfig();
    }, []);

    // URL'den hata mesajı kontrolü (SAML dönüşü için)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const errorMsg = params.get('error');
        if (errorMsg) {
            setError(decodeURIComponent(errorMsg));
            // URL'deki hata parametresini temizle
            window.history.replaceState({}, document.title, location.pathname);
        }
    }, [location]);

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
                    setIsRegisterMode(false);
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
        window.location.href = `${API_URL}/auth/login`;
    };

    const iconWrapperStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: branding.companyLogo ? 'auto' : '64px',
        height: branding.companyLogo ? 'auto' : '64px',
        borderRadius: '16px',
        background: branding.companyLogo ? 'white' : 'var(--accent-primary)',
        padding: branding.companyLogo ? '10px' : '0',
        marginBottom: '20px',
        boxShadow: 'var(--glass-shadow-hover)',
        border: branding.companyLogo ? '1px solid var(--glass-border)' : 'none'
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
                    <div style={iconWrapperStyle}>
                        {branding.companyLogo ? (
                            <img
                                src={`${API_URL}${branding.companyLogo}`}
                                alt="Logo"
                                style={{ maxHeight: '60px', maxWidth: '180px', objectFit: 'contain' }}
                            />
                        ) : (
                            <FaUserLock size={30} color="var(--bg-card)" />
                        )}
                    </div>
                    <h1 style={{
                        margin: 0,
                        fontSize: '1.75rem',
                        color: 'var(--text-primary)',
                        fontWeight: '700',
                        letterSpacing: '-0.025em'
                    }}>
                        {branding.companyName}
                    </h1>
                    <p style={{
                        margin: '10px 0 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.925rem'
                    }}>
                        {showLocalForm
                            ? (samlEnabled ? 'Yerel hesap ile oturum açın' : 'Kurumsal giriş devre dışı, yerel hesap kullanın')
                            : 'Devam etmek için kurumsal hesabınızı kullanın'}
                    </p>
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

                    {showLocalForm ? (
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
                            >
                                {loading ? 'İşleniyor...' : (isRegisterMode ? 'Hesap Oluştur' : 'Giriş Yap')}
                            </button>

                            <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {allowRegistration && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRegisterMode(!isRegisterMode);
                                            setError('');
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.825rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {isRegisterMode ? 'Zaten hesabınız var mı? Giriş yapın' : 'Yeni yönetici hesabı oluştur'}
                                    </button>
                                )}
                                {samlEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowLocalForm(false);
                                            setError('');
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--accent-primary)',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            marginTop: '10px'
                                        }}
                                    >
                                        ← Kurumsal Girişe Dön
                                    </button>
                                )}
                            </div>
                        </form>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                padding: '30px',
                                background: 'rgba(var(--accent-primary-rgb), 0.05)',
                                borderRadius: '20px',
                                border: '1px dashed var(--glass-border)',
                                marginBottom: '30px'
                            }}>
                                <p style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: '500' }}>
                                    Güvenli Kurumsal Giriş
                                </p>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.875rem', lineHeight: '1.6' }}>
                                    Şirket e-posta ve şifrenizle oturum açmak için aşağıdaki butona tıklayın.
                                </p>
                                <button
                                    onClick={handleShibbolethLogin}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: 'var(--accent-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        boxShadow: '0 4px 12px rgba(var(--accent-primary-rgb), 0.3)'
                                    }}
                                >
                                    Kurumsal Giriş (SAML/SSO)
                                </button>
                            </div>

                            <button
                                onClick={() => setShowLocalForm(true)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-tertiary)',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Yönetici misiniz? Yerel hesapla giriş yapın
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
