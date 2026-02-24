import React from 'react';
import api from '../api/axios';
import { FaGithub, FaEnvelope, FaIdCard, FaCode, FaRocket, FaShieldAlt, FaMobileAlt, FaDatabase, FaPaintBrush } from 'react-icons/fa';

const About = () => {
    const [adminInfo, setAdminInfo] = React.useState({
        name: "Muhammet Sağ",
        email: "m.sag@catborise.com",
        github: "https://github.com/catborise/bizcarder",
        linkedin: "https://linkedin.com/in/muhammetsag"
    });

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/api/settings');
                setAdminInfo({
                    name: res.data.developerName || "Muhammet Sağ",
                    email: res.data.developerEmail || "m.sag@catborise.com",
                    github: res.data.developerGithub || "https://github.com/catborise/bizcarder",
                    linkedin: res.data.developerLinkedin || "https://linkedin.com/in/muhammetsag"
                });
            } catch (error) {
                console.error('About settings fetch error:', error);
            }
        };
        fetchSettings();
    }, []);

    const capabilities = [
        {
            icon: <FaRocket />,
            title: "Hızlı Kartvizit Tarama",
            description: "Yapay zeka destekli OCR teknolojisi ile kartvizitleri saniyeler içinde dijital rehberinize ekleyin."
        },
        {
            icon: <FaDatabase />,
            title: "Gelişmiş CRM",
            description: "Müşteri görüşmelerini kaydedin, hatırlatıcılar kurun ve tüm iletişim geçmişini tek noktadan yönetin."
        },
        {
            icon: <FaIdCard />,
            title: "Dijital Kartvizit (vCard)",
            description: "Kendi dijital kartvizitinizi oluşturun ve QR kod ile anında paylaşın. Rehbere tek tıkla kayıt imkanı."
        },
        {
            icon: <FaShieldAlt />,
            title: "Güvenli Veri Yönetimi",
            description: "Rol tabanlı yetkilendirme sistemi ve çöp kutusu özelliği ile verileriniz her zaman güvende."
        },
        {
            icon: <FaMobileAlt />,
            title: "PWA Desteği",
            description: "Uygulamayı telefonunuza yükleyerek bir mobil uygulama gibi kullanın, çevrimdışı senkronizasyonun keyfini çıkarın."
        },
        {
            icon: <FaPaintBrush />,
            title: "Modern Tasarım",
            description: "Glassmorphism estetiği ve dinamik tema (açık/koyu) desteği ile göz yormayan, premium bir kullanıcı deneyimi."
        }
    ];

    const cardStyle = {
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: 'var(--glass-shadow)',
        marginBottom: '30px',
        transition: 'transform 0.3s ease'
    };

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '50px' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: '800',
                    color: 'var(--text-primary)',
                    marginBottom: '10px',
                    letterSpacing: '-0.03em'
                }}>
                    Hakkında
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
                    CRM & Akıllı Kartvizit Yönetim Platformu
                </p>
            </div>

            {/* Uygulama Yetenekleri Grid */}
            <section style={{ marginBottom: '60px' }}>
                <h2 style={{ color: 'var(--text-primary)', marginBottom: '30px', borderLeft: '4px solid var(--accent-primary)', paddingLeft: '15px' }}>
                    Sistem Yetenekleri
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                }}>
                    {capabilities.map((cap, index) => (
                        <div key={index} style={cardStyle}>
                            <div style={{
                                fontSize: '2rem',
                                color: 'var(--accent-primary)',
                                marginBottom: '15px',
                                background: 'rgba(var(--accent-primary-rgb), 0.1)',
                                width: 'fit-content',
                                padding: '10px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {cap.icon}
                            </div>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>{cap.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{cap.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Admin & İletişim */}
            <section>
                <h2 style={{ color: 'var(--text-primary)', marginBottom: '30px', borderLeft: '4px solid var(--accent-secondary)', paddingLeft: '15px' }}>
                    İletişim & Geliştirici
                </h2>
                <div style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'center' }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem',
                        color: 'var(--bg-card)'
                    }}>
                        <FaCode />
                    </div>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '5px' }}>{adminInfo.name}</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Full Stack Developer & Sistem Yöneticisi</p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                            <a href={`mailto:${adminInfo.email}`} style={{
                                textDecoration: 'none',
                                color: 'var(--bg-card)',
                                background: 'var(--accent-primary)',
                                padding: '10px 20px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600'
                            }}>
                                <FaEnvelope /> {adminInfo.email}
                            </a>
                            <a href={adminInfo.github} target="_blank" rel="noopener noreferrer" style={{
                                textDecoration: 'none',
                                color: 'var(--text-primary)',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                padding: '10px 20px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600'
                            }}>
                                <FaGithub /> GitHub Hesabı
                            </a>
                            <a href="/my-card" style={{
                                textDecoration: 'none',
                                color: 'var(--text-primary)',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                padding: '10px 20px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600'
                            }}>
                                <FaIdCard /> Dijital Kartvizit
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <footer style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                © {new Date().getFullYear()} BizCarder CRM. Tüm hakları saklıdır.
            </footer>
        </div>
    );
};

export default About;
