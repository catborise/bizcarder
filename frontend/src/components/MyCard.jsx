import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
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

    const shareUrl = personalCard ? `${window.location.origin}/contact-profile/${personalCard.sharingToken}` : '';

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div className="skeleton skeleton-title" style={{ width: '300px', margin: 0 }}></div>
                    <div className="skeleton skeleton-btn" style={{ width: '150px' }}></div>
                </div>
                <div className="my-card-layout">
                    {/* Profile Skeleton */}
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '24px',
                        border: '1px solid var(--glass-border)',
                        overflow: 'hidden',
                        padding: '0 30px 40px'
                    }}>
                        <div className="skeleton" style={{ height: '120px', margin: '0 -30px 20px', width: 'calc(100% + 60px)' }}></div>
                        <div className="skeleton skeleton-avatar"></div>
                        <div className="skeleton skeleton-title"></div>
                        <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                        <div style={{ height: '1px', background: 'var(--glass-border)', margin: '20px 0' }}></div>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '10px' }}></div>
                                <div className="skeleton skeleton-text" style={{ flex: 1, height: '30px' }}></div>
                            </div>
                        ))}
                    </div>
                    {/* QR Sidebar Skeleton */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={{
                            background: 'var(--glass-bg)',
                            padding: '30px',
                            borderRadius: '24px',
                            border: '1px solid var(--glass-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            minHeight: '400px'
                        }}>
                            <div className="skeleton skeleton-text" style={{ width: '150px', height: '25px', marginBottom: '30px' }}></div>
                            <div className="skeleton" style={{ width: '150px', height: '150px', borderRadius: '18px', marginBottom: '30px' }}></div>
                            <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
                            <div className="skeleton skeleton-text" style={{ width: '70%' }}></div>
                            <div className="skeleton skeleton-btn" style={{ width: '100%', marginTop: 'auto' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                staggerChildren: 0.1
            }
        }
    };

    return (
        <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={containerVariants}
            style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}
        >
            <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{
                    color: 'var(--text-primary)',
                    margin: 0,
                    fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
                    fontWeight: '700'
                }}>Dijital Kartvizitim</h2>


                {personalCard && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsEditModalOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(10px)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--glass-bg-hover)'}
                        onMouseLeave={(e) => e.target.style.background = 'var(--glass-bg)'}
                    >
                        <FaEdit /> Bilgileri Düzenle
                    </motion.button>

                )}
            </motion.div>

            {!personalCard ? (
                <div style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    padding: '60px 40px',
                    borderRadius: '24px',
                    textAlign: 'center',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)'
                }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        background: 'var(--accent-primary)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 30px',
                        boxShadow: 'var(--glass-shadow-hover)'
                    }}>
                        <FaIdCard size={60} color="var(--bg-card)" />
                    </div>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.8rem', marginBottom: '15px' }}>Kendi Kartvizitini Oluştur</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '35px', maxWidth: '500px', margin: '0 auto 35px', lineHeight: '1.6' }}>
                        Dijital dünyada profesyonel varlığınızı yansıtın. Bilgilerinizi girin, profilinizi oluşturun ve QR kodunuzla saniyeler içinde paylaşın.
                    </p>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        style={{
                            padding: '16px 40px',
                            background: 'var(--accent-primary)',
                            color: 'var(--bg-card)',
                            border: 'none',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '1.1rem',
                            boxShadow: 'var(--glass-shadow)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-5px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        Başla ve Oluştur
                    </button>
                </div>

            ) : (
                <motion.div variants={itemVariants} className="my-card-layout">

                    {/* Premium Profile Card */}
                    <div style={{
                        background: 'var(--bg-card)',
                        backdropFilter: 'blur(30px)',
                        borderRadius: '24px',
                        border: '1px solid var(--glass-border)',
                        overflow: 'hidden',
                        boxShadow: 'var(--glass-shadow)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Card Header with Background Decoration */}
                        <div style={{
                            height: '120px',
                            background: 'var(--accent-primary)',
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
                                color: 'rgba(255,255,255,0.9)',
                                fontWeight: '700',
                                zIndex: 2
                            }}>
                                <FaCircle size={8} color="var(--accent-success)" /> Yayında
                            </div>
                        </div>

                        <div style={{ padding: '0 30px 40px', marginTop: '-60px', position: 'relative' }}>
                            {/* Company Logo - Refined Placement */}
                            {personalCard.logoUrl && (
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '25px',
                                    width: '70px',
                                    height: '70px',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '12px',
                                    padding: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 5
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
                                background: 'var(--bg-main)',
                                borderRadius: '22px',
                                border: '4px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                color: 'var(--text-primary)',
                                marginBottom: '20px',
                                overflow: 'hidden',
                                boxShadow: 'var(--glass-shadow)'
                            }}>

                                {personalCard.frontImageUrl ? (
                                    <img src={`${API_URL}${personalCard.frontImageUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    personalCard.firstName[0] + personalCard.lastName[0]
                                )}
                            </div>

                            <h3 style={{ 
                                color: 'var(--text-primary)', 
                                fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', 
                                margin: '0 0 5px 0', 
                                fontWeight: '800',
                                lineHeight: '1.2'
                            }}>
                                {personalCard.firstName} {personalCard.lastName}
                            </h3>
                            <p style={{ 
                                color: 'var(--accent-primary)', 
                                fontSize: 'clamp(1rem, 3vw, 1.2rem)', 
                                margin: '0 0 25px 0', 
                                fontWeight: '500',
                                lineHeight: '1.4'
                            }}>
                                {personalCard.title} {personalCard.company && `@ ${personalCard.company}`}
                            </p>

                            <div style={{ height: '1px', background: 'var(--glass-border)', marginBottom: '25px' }}></div>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                {personalCard.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-input)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaEnvelope color="var(--accent-primary)" />
                                        </div>
                                        <div style={{ color: 'var(--text-primary)' }}>{personalCard.email}</div>
                                    </div>
                                )}

                                {personalCard.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-input)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaPhone color="var(--accent-primary)" />
                                        </div>
                                        <div style={{ color: 'var(--text-primary)' }}>{personalCard.phone}</div>
                                    </div>
                                )}

                                {personalCard.website && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-input)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaGlobe color="var(--accent-success)" />
                                        </div>
                                        <div style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>{personalCard.website}</div>
                                    </div>
                                )}

                                {personalCard.city && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-input)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaMapMarkerAlt color="var(--accent-error)" />
                                        </div>
                                        <div style={{ color: 'var(--text-primary)' }}>{personalCard.city}, {personalCard.country}</div>
                                    </div>
                                )}

                            </div>

                            <div style={{ 
                                marginTop: '30px', 
                                display: 'flex', 
                                gap: '10px',
                                flexWrap: 'wrap' 
                            }}>
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: 'var(--glass-bg-hover)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleDownloadVCard}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: 'var(--glass-bg)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <FaDownload /> vCard İndir
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.05, opacity: 0.9 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleShare}
                                    style={{
                                        padding: '14px 20px',
                                        background: 'var(--accent-primary)',
                                        color: 'var(--bg-card)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <FaShareAlt />
                                </motion.button>

                            </div>
                        </div>
                    </div>

                    {/* Sharing Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={{
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(20px)',
                            padding: '30px',
                            borderRadius: '24px',
                            border: '1px solid var(--glass-border)',
                            textAlign: 'center',
                            boxShadow: 'var(--glass-shadow)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '400px'
                        }}>
                            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.4rem', marginBottom: '20px', fontWeight: '700' }}>QR Kod ile Paylaş</h4>

                            <div style={{
                                background: '#fff',
                                padding: '15px',
                                borderRadius: '18px',
                                display: 'inline-block',
                                marginBottom: '25px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                border: '1px solid var(--glass-border)',
                                position: 'relative',
                                cursor: 'pointer'
                            }}
                                onClick={() => setIsQrModalOpen(true)}
                            >
                                <QRCodeSVG value={shareUrl} size={150} />
                            </div>
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', lineHeight: '1.5', padding: '0 10px' }}>
                                Diğer kullanıcılar bu QR kodu taratarak dijital kartvizit bilgilerinize anında ulaşabilir.
                            </p>


                            <div style={{
                                marginTop: '25px',
                                padding: '12px 15px',
                                background: 'var(--bg-input)',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <div style={{
                                    flex: 1,
                                    color: 'var(--text-tertiary)',
                                    fontSize: '0.75rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'left',
                                    maxWidth: '180px' // Limit the width to prevent expansion
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
                                        color: 'var(--accent-primary)',
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
                            background: 'var(--glass-bg)',
                            padding: '25px',
                            borderRadius: '24px',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-primary)'
                        }}>
                            <h5 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>💡 İpucu</h5>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
                                Dijital kartvizit profilinizi e-posta imzanıza ekleyerek profesyonel ağınızı büyütebilirsiniz.
                            </p>
                        </div>

                    </div>

                </motion.div>
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

            <AnimatePresence>
                {isQrModalOpen && (
                    <QRCodeOverlay
                        title={`${personalCard?.firstName} ${personalCard?.lastName}`}
                        url={shareUrl}
                        vCardData={generateVCardString(personalCard)}
                        onClose={() => setIsQrModalOpen(false)}
                        onDownloadVCard={handleDownloadVCard}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MyCard;
