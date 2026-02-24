import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api, { API_URL } from '../api/axios';
import { downloadFile } from '../utils/downloadHelper';
import { useNotification } from '../context/NotificationContext';
import { FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaDownload, FaBuilding, FaUserCircle, FaQrcode } from 'react-icons/fa';
import QRCodeOverlay from './QRCodeOverlay';
import { generateVCardString } from '../utils/vcardHelper';

const ContactProfile = () => {
    const { id } = useParams();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const { showNotification } = useNotification();

    useEffect(() => {
        const fetchPublicCard = async () => {
            try {
                // Public endpoint'i kullan
                const res = await api.get(`/api/cards/public/${id}`);
                setCard(res.data);
            } catch (err) {
                console.error('Error fetching public card:', err);
                setError(err.response?.data?.error || 'Kartvizit yüklenemedi.');
            } finally {
                setLoading(false);
            }
        };

        fetchPublicCard();
    }, [id]);

    const handleDownloadVCard = async () => {
        if (!card) return;
        try {
            showNotification('vCard dosyası hazırlanıyor...', 'info');
            // Public vCF endpoint'ini kullan
            const response = await api.get(`/api/cards/public/${card.id}/vcf`, {
                responseType: 'blob'
            });
            downloadFile(response.data, `${card.firstName}_${card.lastName}.vcf`, 'text/vcard');
            showNotification('vCard indirildi.', 'success');
        } catch (err) {
            showNotification('İndirme başarısız.', 'error');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: 'var(--text-primary)' }}>
                <div className="loader">Yükleniyor...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-primary)' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>Olamaz! 😕</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>{error}</p>
            </div>
        );
    }

    const shareUrl = window.location.href;

    return (
        <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <div style={{
                background: 'var(--bg-card)',
                backdropFilter: 'blur(30px)',
                borderRadius: '32px',
                border: '1px solid var(--glass-border)',
                overflow: 'hidden',
                boxShadow: 'var(--glass-shadow)',
                position: 'relative'
            }}>
                {/* Header Gradient */}
                <div style={{
                    height: '160px',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                    position: 'relative'
                }}>
                    {card.logoUrl && (
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '25px',
                            width: '70px',
                            height: '70px',
                            background: 'var(--bg-input)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <img src={`${API_URL}${card.logoUrl}`} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                    )}
                </div>

                <div style={{ padding: '0 40px 40px', marginTop: '-80px', position: 'relative', textAlign: 'center' }}>
                    {/* Profile Picture / Avatar */}
                    <div style={{
                        width: '160px',
                        height: '160px',
                        background: 'var(--bg-card)',
                        borderRadius: '40px',
                        border: '6px solid var(--glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '4rem',
                        color: 'var(--text-primary)',
                        margin: '0 auto 25px',
                        overflow: 'hidden',
                        boxShadow: 'var(--glass-shadow-hover)'
                    }}>
                        {card.frontImageUrl ? (
                            <img src={`${API_URL}${card.frontImageUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <FaUserCircle size={100} opacity={0.3} />
                        )}
                    </div>

                    <h1 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', margin: '0 0 10px 0', fontWeight: '800' }}>
                        {card.firstName} {card.lastName}
                    </h1>
                    <p style={{ color: 'var(--accent-primary)', fontSize: '1.25rem', margin: '0 0 10px 0', fontWeight: '600' }}>{card.title}</p>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <FaBuilding opacity={0.5} /> {card.company}
                    </div>

                    <div style={{ display: 'grid', gap: '20px', textAlign: 'left', marginBottom: '40px' }}>
                        {card.email && (
                            <a href={`mailto:${card.email}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(var(--accent-primary-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaEnvelope color="var(--accent-primary)" />
                                </div>
                                <span>{card.email}</span>
                            </a>
                        )}
                        {card.phone && (
                            <a href={`tel:${card.phone}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(var(--accent-secondary-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaPhone color="var(--accent-secondary)" />
                                </div>
                                <span>{card.phone}</span>
                            </a>
                        )}
                        {card.website && (
                            <a href={card.website.startsWith('http') ? card.website : `https://${card.website}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(var(--accent-success-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaGlobe color="var(--accent-success)" />
                                </div>
                                <span>{card.website}</span>
                            </a>
                        )}
                        {(card.city || card.country) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(var(--accent-error-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaMapMarkerAlt color="var(--accent-error)" />
                                </div>
                                <span>{[card.city, card.country].filter(Boolean).join(', ')}</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button
                            onClick={handleDownloadVCard}
                            style={{
                                flex: 2,
                                padding: '16px',
                                background: 'var(--accent-primary)',
                                color: 'var(--bg-card)',
                                border: 'none',
                                borderRadius: '18px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                fontSize: '1.1rem',
                                boxShadow: 'var(--glass-shadow)'
                            }}
                        >
                            <FaDownload /> Rehbere Ekle (vCard)
                        </button>
                        <button
                            onClick={() => setIsQrModalOpen(true)}
                            style={{
                                flex: 1,
                                padding: '16px',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '18px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="QR Kod Göster"
                        >
                            <FaQrcode size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                CRM Bizcard App ile oluşturuldu
            </p>

            {isQrModalOpen && (
                <QRCodeOverlay
                    title={`${card.firstName} ${card.lastName}`}
                    url={shareUrl}
                    vCardData={generateVCardString(card)}
                    onClose={() => setIsQrModalOpen(false)}
                    onDownloadVCard={handleDownloadVCard}
                />
            )}
        </div>
    );
};

export default ContactProfile;
