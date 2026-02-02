import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
                const res = await fetch('http://localhost:5000/auth/config');
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
        window.location.href = 'http://localhost:5000/auth/login';
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '480px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '30px 30px 20px',
                    textAlign: 'center',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        marginBottom: '15px'
                    }}>
                        <FaUserLock size={30} color="white" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '28px', color: 'white', fontWeight: 'bold' }}>
                        CRM Giriş
                    </h1>
                    <p style={{ margin: '8px 0 0', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                        Devam etmek için oturum açın
                    </p>
                </div>

                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '20px 30px 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <button
                        onClick={() => { setActiveTab('local'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: activeTab === 'local' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            color: 'white',
                            border: 'none',
                            borderBottom: activeTab === 'local' ? '2px solid white' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease',
                            borderRadius: '8px 8px 0 0'
                        }}
                    >
                        Yerel Giriş
                    </button>
                    <button
                        onClick={() => { setActiveTab('shibboleth'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: activeTab === 'shibboleth' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            color: 'white',
                            border: 'none',
                            borderBottom: activeTab === 'shibboleth' ? '2px solid white' : '2px solid transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease',
                            borderRadius: '8px 8px 0 0'
                        }}
                    >
                        Shibboleth
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '30px' }}>
                    {error && (
                        <div style={{
                            padding: '12px',
                            marginBottom: '20px',
                            backgroundColor: 'rgba(255, 107, 107, 0.2)',
                            border: '1px solid rgba(255, 107, 107, 0.5)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    {activeTab === 'local' ? (
                        <form onSubmit={handleLocalSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                                    <FaUser style={{ marginRight: '6px' }} />
                                    Kullanıcı Adı {isRegisterMode && 'veya E-posta'}
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder={isRegisterMode ? "kullaniciadi" : "kullaniciadi veya email"}
                                />
                            </div>

                            {isRegisterMode && (
                                <>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                                            <FaEnvelope style={{ marginRight: '6px' }} />
                                            E-posta
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                            placeholder="ornek@email.com"
                                        />
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                                            <FaIdCard style={{ marginRight: '6px' }} />
                                            Görünen Ad (Opsiyonel)
                                        </label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                            placeholder="Adınız Soyadınız"
                                        />
                                    </div>
                                </>
                            )}

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                                    <FaKey style={{ marginRight: '6px' }} />
                                    Şifre
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    backgroundColor: loading ? '#999' : 'white',
                                    color: '#667eea',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                                }}
                            >
                                {loading ? 'İşleniyor...' : (isRegisterMode ? 'Kayıt Ol' : 'Giriş Yap')}
                            </button>

                            {allowRegistration && (
                                <div style={{ marginTop: '15px', textAlign: 'center' }}>
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
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        {isRegisterMode ? 'Zaten hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}
                                    </button>
                                </div>
                            )}
                            {!allowRegistration && isRegisterMode && (
                                <div style={{ marginTop: '15px', textAlign: 'center', color: '#ffb3b3', fontSize: '12px' }}>
                                    Kayıt özelliği yönetici tarafından geçici olarak kapatılmıştır.
                                </div>
                            )}
                        </form>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '20px', fontSize: '14px' }}>
                                Kurumsal kimlik bilgilerinizle giriş yapmak için Shibboleth servisini kullanın.
                            </p>
                            <button
                                onClick={handleShibbolethLogin}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    backgroundColor: 'white',
                                    color: '#667eea',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                                }}
                            >
                                Shibboleth ile Giriş Yap
                            </button>
                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '15px', fontSize: '12px' }}>
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
