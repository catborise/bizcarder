import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { API_URL } from '../../api/axios';
import { downloadFile } from '../../utils/downloadHelper';
import { useNotification } from '../../context/NotificationContext';
import { FaDownload, FaShareAlt, FaEdit, FaIdCard, FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaCircle, FaCopy } from 'react-icons/fa';
import AddCard from '../cards/AddCard';
import Modal from '../shared/Modal';
import QRCodeOverlay from '../shared/QRCodeOverlay';
import { generateVCardString } from '../../utils/vcardHelper';

const ContactRow = ({ icon: Icon, color, value, isLink }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{
            width: '36px', height: '36px',
            background: `${color}18`, border: `1px solid ${color}30`,
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
            <Icon size={14} color={color} />
        </div>
        <span style={{
            color: isLink ? 'var(--accent-primary)' : 'var(--text-primary)',
            fontSize: '0.85rem', fontWeight: isLink ? 500 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
            {value}
        </span>
    </div>
);

const MyCard = () => {
    const { t } = useTranslation(['pages', 'common']);
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
            showNotification(t('pages:myCard.loadError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPersonalCard(); }, []);

    const handleDownloadVCard = async () => {
        if (!personalCard) return;
        try {
            showNotification(t('pages:myCard.vcardPreparing'), 'info');
            const response = await api.get(`/api/cards/${personalCard.id}/vcf`, { responseType: 'blob' });
            downloadFile(response.data, `${personalCard.firstName}_${personalCard.lastName}.vcf`, 'text/vcard');
            showNotification(t('pages:myCard.vcardDownloaded'), 'success');
        } catch (err) {
            showNotification(t('pages:myCard.vcardDownloadError'), 'error');
        }
    };

    const handleCardUpdated = () => {
        fetchPersonalCard();
        setIsEditModalOpen(false);
        showNotification(t('pages:myCard.cardReady'), 'success');
    };

    const shareUrl = personalCard ? `${window.location.origin}/contact-profile/${personalCard.sharingToken}` : '';

    const handleShare = async () => {
        if (!personalCard) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: t('pages:myCard.shareTitle', { firstName: personalCard.firstName, lastName: personalCard.lastName }),
                    text: t('pages:myCard.shareText', { company: personalCard.company, title: personalCard.title, firstName: personalCard.firstName, lastName: personalCard.lastName }),
                    url: shareUrl
                });
            } catch (err) {
                if (err.name !== 'AbortError') showNotification(t('pages:myCard.shareError'), 'error');
            }
        } else {
            navigator.clipboard.writeText(shareUrl);
            showNotification(t('pages:myCard.linkCopied'), 'success');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
    };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

    if (loading) {
        return (
            <div className="mycard-page">
                <div className="mycard-header">
                    <div className="skeleton-box" style={{ width: '180px', height: '28px', borderRadius: '8px' }} />
                    <div className="skeleton-box" style={{ width: '100px', height: '36px', borderRadius: '10px' }} />
                </div>
                <div className="mycard-grid">
                    <div className="skeleton-box" style={{ height: '400px', borderRadius: '20px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div className="skeleton-box" style={{ height: '280px', borderRadius: '20px' }} />
                        <div className="skeleton-box" style={{ height: '70px', borderRadius: '16px' }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="mycard-page">
            {/* Header */}
            <motion.div variants={itemVariants} className="mycard-header">
                <h2 style={{ margin: 0 }}>{t('pages:myCard.title')}</h2>
                {personalCard && (
                    <button onClick={() => setIsEditModalOpen(true)} className="glass-button" style={{ fontWeight: 600, gap: '8px' }}>
                        <FaEdit size={14} /> {t('pages:myCard.editInfo')}
                    </button>
                )}
            </motion.div>

            {/* Empty State */}
            {!personalCard ? (
                <motion.div variants={itemVariants} style={{
                    background: 'var(--gradient-primary)', border: '1px solid var(--gradient-primary-border)',
                    padding: 'var(--space-12) var(--space-6)', borderRadius: '20px', textAlign: 'center',
                }}>
                    <div style={{
                        width: '72px', height: '72px',
                        background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                        borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-6)',
                    }}>
                        <FaIdCard size={32} color="#fff" />
                    </div>
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>{t('pages:myCard.createTitle')}</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto var(--space-6)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                        {t('pages:myCard.createDescription')}
                    </p>
                    <button onClick={() => setIsEditModalOpen(true)} className="glass-button" style={{
                        background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                        color: '#fff', border: 'none', padding: '12px 32px', fontSize: '0.95rem', fontWeight: 700,
                    }}>
                        {t('pages:myCard.startCreate')}
                    </button>
                </motion.div>
            ) : (
                <motion.div variants={itemVariants} className="mycard-grid">
                    {/* Profile Card */}
                    <div className="mycard-profile-card">
                        {/* Gradient Banner */}
                        <div style={{
                            height: '90px', background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                            <div style={{
                                position: 'absolute', right: '12px', top: '12px',
                                display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px',
                                background: 'rgba(255,255,255,0.15)', borderRadius: '20px',
                                fontSize: '0.65rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600,
                            }}>
                                <FaCircle size={5} color="var(--accent-success)" /> {t('pages:myCard.live')}
                            </div>
                        </div>

                        <div className="mycard-profile-body">
                            {personalCard.logoUrl && (
                                <div style={{
                                    position: 'absolute', top: '4px', right: 'var(--space-4)',
                                    width: '48px', height: '48px', background: '#fff', borderRadius: '10px',
                                    padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 5,
                                }}>
                                    <img src={`${API_URL}${personalCard.logoUrl}`} alt={t('pages:myCard.companyLogoAlt')}
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                </div>
                            )}

                            <div className="mycard-avatar" style={{
                                background: 'var(--bg-card)', borderRadius: '16px', border: '3px solid var(--glass-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2rem', fontWeight: 800, color: 'var(--accent-secondary)',
                                marginBottom: 'var(--space-3)', overflow: 'hidden', boxShadow: 'var(--glass-shadow)',
                            }}>
                                {personalCard.frontImageUrl ? (
                                    <img src={`${API_URL}${personalCard.frontImageUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    personalCard.firstName[0] + personalCard.lastName[0]
                                )}
                            </div>

                            <h3 style={{ margin: '0 0 2px 0', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                                {personalCard.firstName} {personalCard.lastName}
                            </h3>
                            <p style={{ color: 'var(--accent-secondary)', fontSize: '0.85rem', margin: '0 0 var(--space-4) 0', fontWeight: 500 }}>
                                {personalCard.title}{personalCard.company && ` @ ${personalCard.company}`}
                            </p>

                            <div style={{ height: '1px', background: 'var(--glass-border)', marginBottom: 'var(--space-4)' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {personalCard.email && <ContactRow icon={FaEnvelope} color="var(--accent-primary)" value={personalCard.email} />}
                                {personalCard.phone && <ContactRow icon={FaPhone} color="var(--accent-secondary)" value={personalCard.phone} />}
                                {personalCard.website && <ContactRow icon={FaGlobe} color="var(--accent-success)" value={personalCard.website} isLink />}
                                {personalCard.city && <ContactRow icon={FaMapMarkerAlt} color="var(--accent-error)" value={`${personalCard.city}${personalCard.country ? `, ${personalCard.country}` : ''}`} />}
                            </div>

                            <div className="mycard-actions">
                                <button onClick={handleDownloadVCard} className="glass-button" style={{ flex: 1, padding: '10px', justifyContent: 'center', fontWeight: 600, gap: '8px' }}>
                                    <FaDownload size={13} /> {t('pages:myCard.downloadVcard')}
                                </button>
                                <button onClick={handleShare} className="glass-button" style={{
                                    padding: '10px 14px', background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                                    color: '#fff', border: 'none',
                                }}>
                                    <FaShareAlt size={13} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* QR & Share Sidebar */}
                    <div className="mycard-sidebar">
                        <div className="mycard-qr-card">
                            <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: '0.95rem', fontWeight: 700 }}>
                                {t('pages:myCard.shareWithQr')}
                            </h4>
                            <div onClick={() => setIsQrModalOpen(true)} style={{
                                background: '#fff', padding: '10px', borderRadius: '14px',
                                display: 'inline-block', marginBottom: 'var(--space-3)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.06)', cursor: 'pointer',
                            }}>
                                <QRCodeSVG value={shareUrl} size={120} />
                            </div>
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', lineHeight: 1.5, margin: '0 0 var(--space-3) 0' }}>
                                {t('pages:myCard.qrDescription')}
                            </p>
                            <div className="mycard-share-url">
                                <div style={{ flex: 1, color: 'var(--text-tertiary)', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                                    {shareUrl}
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(shareUrl); showNotification(t('pages:myCard.linkCopiedShort'), 'success'); }}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                                    <FaCopy size={10} /> {t('pages:myCard.copy')}
                                </button>
                            </div>
                        </div>

                        <div className="mycard-tip-card">
                            <h5 style={{ margin: '0 0 var(--space-1) 0', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                                {t('pages:myCard.tipTitle')}
                            </h5>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                                {t('pages:myCard.tipDescription')}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            <Modal title={personalCard ? t('pages:myCard.editModalTitle') : t('pages:myCard.createModalTitle')}
                isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                <AddCard onCardAdded={handleCardUpdated} activeCard={personalCard} isPersonal={true} />
            </Modal>

            <AnimatePresence>
                {isQrModalOpen && (
                    <QRCodeOverlay title={`${personalCard?.firstName} ${personalCard?.lastName}`}
                        url={shareUrl} vCardData={generateVCardString(personalCard)}
                        onClose={() => setIsQrModalOpen(false)} onDownloadVCard={handleDownloadVCard} />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MyCard;
