import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api, { API_URL } from '../api/axios';
import { downloadFile } from '../utils/downloadHelper';
import { useNotification } from '../context/NotificationContext';
import { FaDownload, FaShareAlt, FaEdit, FaIdCard, FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaCircle, FaSearchPlus } from 'react-icons/fa';
import AddCard from './AddCard';
import Modal from './Modal';
import QRCodeOverlay from './QRCodeOverlay';
import { generateVCardString } from '../utils/vcardHelper';

const MyCard = () => {
    const [personalCard, setPersonalCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const { showNotification } = useNotification();

    const fetchPersonalCard = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/cards/personal');
            setPersonalCard(res.data);
        } catch (err) {
            console.error('Error fetching personal card:', err);
            showNotification('Kişisel kartvizit yüklenirken hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPersonalCard();
    }, []);

    const handleDownloadVCard = async () => {
        if (!personalCard) return;
        try {
            showNotification('vCard hazırlanıyor...', 'info');
            const response = await api.get(`/api/cards/${personalCard.id}/vcf`, {
                responseType: 'blob'
            });

            downloadFile(response.data, `${personalCard.firstName}_${personalCard.lastName}.vcf`, 'text/vcard');
            showNotification('vCard indirildi.', 'success');
        } catch (err) {
            showNotification('vCard indirilemedi.', 'error');
        }
    };

    const handleCardUpdated = () => {
        fetchPersonalCard();
        setIsEditModalOpen(false);
        showNotification('Dijital kartvizitiniz hazır!', 'success');
    };

    const handleShare = async () => {
        if (!personalCard) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${personalCard.firstName} ${personalCard.lastName} - Dijital Kartvizit`,
                    text: `${personalCard.company} bünyesinde ${personalCard.title} olarak görev yapan ${personalCard.firstName} ${personalCard.lastName} kişisinin dijital kartviziti.`,
                    url: shareUrl
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    showNotification('Paylaşım sırasında bir hata oluştu.', 'error');
                }
            }
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(shareUrl);
            showNotification('Paylaşım linki kopyalandı!', 'success');
        }
    };

    const shareUrl = personalCard ? `${window.location.origin}/contact-profile/${personalCard.id}` : '';

    if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Yükleniyor...</div>;

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{
                    color: 'white',
                    margin: 0,
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}>Dijital Kartvizitim</h2>

                {personalCard && (
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        <FaEdit /> Bilgileri Düzenle
                    </button>
                )}
            </div>

            {!personalCard ? (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    padding: '60px 40px',
                    borderRadius: '24px',
                    textAlign: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 30px',
                        boxShadow: '0 10px 30px rgba(118, 75, 162, 0.4)'
                    }}>
                        <FaIdCard size={60} color="white" />
                    </div>
                    <h3 style={{ color: 'white', fontSize: '1.8rem', marginBottom: '15px' }}>Kendi Kartvizitini Oluştur</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '35px', maxWidth: '500px', margin: '0 auto 35px', lineHeight: '1.6' }}>
                        Dijital dünyada profesyonel varlığınızı yansıtın. Bilgilerinizi girin, profilinizi oluşturun ve QR kodunuzla saniyeler içinde paylaşın.
                    </p>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        style={{
                            padding: '16px 40px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '1.1rem',
                            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-5px)';
                            e.target.style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
                        }}
                    >
                        Başla ve Oluştur
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>

                    {/* Premium Profile Card */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(30px)',
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Card Header with Background Decoration */}
                        <div style={{
                            height: '120px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Abstract decorative circles */}
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                            <div style={{ position: 'absolute', bottom: '-30px', left: '10%', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

                            <div style={{
                                position: 'absolute',
                                right: '20px',
                                top: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                background: 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(5px)',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                color: 'white',
                                fontWeight: '600',
                                zIndex: 2
                            }}>
                                <FaCircle size={8} color="#4ade80" /> Yayında
                            </div>
                        </div>

                        <div style={{ padding: '0 30px 40px', marginTop: '-60px', position: 'relative' }}>
                            {/* Company Logo - New Professional Placement */}
                            {personalCard.logoUrl && (
                                <div style={{
                                    position: 'absolute',
                                    top: '80px', // Below the overlap but aligned right
                                    right: '30px',
                                    width: '80px',
                                    height: '80px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    padding: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                                }}>
                                    <img
                                        src={`${API_URL}${personalCard.logoUrl}`}
                                        alt="Şirket Logosu"
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    />
                                </div>
                            )}

                            <div style={{
                                width: '120px',
                                height: '120px',
                                background: '#1a1a1a',
                                borderRadius: '22px',
                                border: '4px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                color: 'white',
                                marginBottom: '20px',
                                overflow: 'hidden',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}>
                                {personalCard.frontImageUrl ? (
                                    <img src={`${API_URL}${personalCard.frontImageUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    personalCard.firstName[0] + personalCard.lastName[0]
                                )}
                            </div>

                            <h3 style={{ color: 'white', fontSize: '2.2rem', margin: '0 0 5px 0', fontWeight: '800' }}>
                                {personalCard.firstName} {personalCard.lastName}
                            </h3>
                            <p style={{ color: '#a78bfa', fontSize: '1.2rem', margin: '0 0 25px 0', fontWeight: '500' }}>
                                {personalCard.title} {personalCard.company && `@ ${personalCard.company}`}
                            </p>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '25px' }}></div>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                {personalCard.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaEnvelope color="#667eea" />
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.8)' }}>{personalCard.email}</div>
                                    </div>
                                )}
                                {personalCard.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaPhone color="#764ba2" />
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.8)' }}>{personalCard.phone}</div>
                                    </div>
                                )}
                                {personalCard.website && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaGlobe color="#4ade80" />
                                        </div>
                                        <div style={{ color: '#667eea', fontWeight: '500' }}>{personalCard.website}</div>
                                    </div>
                                )}
                                {personalCard.city && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaMapMarkerAlt color="#f472b6" />
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.8)' }}>{personalCard.city}, {personalCard.country}</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                                <button
                                    onClick={handleDownloadVCard}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                >
                                    <FaDownload /> vCard İndir
                                </button>
                                <button
                                    onClick={handleShare}
                                    style={{
                                        padding: '14px 20px',
                                        background: 'rgba(102, 126, 234, 0.2)',
                                        color: '#a5b4fc',
                                        border: '1px solid rgba(102, 126, 234, 0.3)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(102, 126, 234, 0.3)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(102, 126, 234, 0.2)'}
                                >
                                    <FaShareAlt />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sharing Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(20px)',
                            padding: '35px',
                            borderRadius: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            textAlign: 'center',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.2)'
                        }}>
                            <h4 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '25px', fontWeight: '700' }}>QR Kod ile Paylaş</h4>
                            <div style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '24px',
                                display: 'inline-block',
                                marginBottom: '25px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                border: '8px solid white',
                                position: 'relative',
                                cursor: 'pointer'
                            }}
                                onClick={() => setIsQrModalOpen(true)}
                            >
                                <QRCodeSVG value={shareUrl} size={180} />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    right: '10px',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem'
                                }}>
                                    <FaSearchPlus />
                                </div>
                            </div>
                            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem', lineHeight: '1.5', padding: '0 10px' }}>
                                Diğer kullanıcılar bu QR kodu taratarak dijital kartvizit bilgilerinize anında ulaşabilir.
                            </p>

                            <div style={{
                                marginTop: '25px',
                                padding: '12px 15px',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <div style={{
                                    flex: 1,
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '0.8rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'left'
                                }}>
                                    {shareUrl}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareUrl);
                                        showNotification('Link kopyalandı!', 'success');
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#667eea',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: '600'
                                    }}
                                >
                                    KOPYALA
                                </button>
                            </div>
                        </div>

                        {/* Integration Tips Card */}
                        <div style={{
                            background: 'rgba(102, 126, 234, 0.1)',
                            padding: '25px',
                            borderRadius: '24px',
                            border: '1px solid rgba(102, 126, 234, 0.2)',
                            color: 'white'
                        }}>
                            <h5 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>💡 İpucu</h5>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
                                Dijital kartvizit profilinizi e-posta imzanıza ekleyerek profesyonel ağınızı büyütebilirsiniz.
                            </p>
                        </div>
                    </div>

                </div>
            )}

            <Modal
                title={personalCard ? "Kartviziti Düzenle" : "Kişisel Kartvizit Oluştur"}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
            >
                <AddCard
                    onCardAdded={handleCardUpdated}
                    activeCard={personalCard}
                    isPersonal={true}
                />
            </Modal>

            {isQrModalOpen && (
                <QRCodeOverlay
                    title={`${personalCard?.firstName} ${personalCard?.lastName}`}
                    url={shareUrl}
                    vCardData={generateVCardString(personalCard)}
                    onClose={() => setIsQrModalOpen(false)}
                    onDownloadVCard={handleDownloadVCard}
                />
            )}
        </div>
    );
};

export default MyCard;
