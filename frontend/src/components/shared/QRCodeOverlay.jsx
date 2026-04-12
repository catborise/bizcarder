import { QRCodeSVG } from 'qrcode.react';
import { FaTimes, FaUserPlus, FaQrcode } from 'react-icons/fa';

const QRCodeOverlay = ({ url, onClose, title = 'Dijital Kartvizit', vCardData = null, onDownloadVCard = null }) => {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(15px)',
                zIndex: 5000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div
                style={{
                    background: 'var(--bg-card)',
                    backdropFilter: 'blur(30px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '420px',
                    padding: '40px 30px',
                    boxShadow: 'var(--glass-shadow)',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    <FaTimes />
                </button>

                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                        marginBottom: '20px',
                        boxShadow: 'var(--glass-shadow)',
                    }}
                >
                    <FaQrcode size={30} color="var(--bg-card)" />
                </div>

                <h3
                    style={{
                        color: 'var(--text-primary)',
                        marginBottom: '10px',
                        fontSize: '1.6rem',
                        fontWeight: '700',
                    }}
                >
                    {title}
                </h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: '30px' }}>
                    Dijital kartvizit bilgileri
                </p>

                <div
                    style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '20px',
                        display: 'inline-block',
                        marginBottom: '30px',
                        boxShadow: 'var(--glass-shadow)',
                        border: '8px solid white',
                    }}
                >
                    <QRCodeSVG value={vCardData || url} size={240} level="M" includeMargin={false} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {onDownloadVCard && (
                        <button
                            onClick={onDownloadVCard}
                            style={{
                                padding: '14px 20px',
                                background: 'var(--accent-success)',
                                color: 'var(--bg-card)',
                                border: 'none',
                                borderRadius: '14px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                boxShadow: 'var(--glass-shadow)',
                                fontSize: '1rem',
                            }}
                        >
                            <FaUserPlus /> Rehbere Ekle (vCard)
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (url.startsWith('http')) {
                                window.open(url, '_blank');
                            } else {
                                // If it's just vCard data, maybe copy to clipboard as fallback or just notify
                                navigator.clipboard.writeText(vCardData || url);
                                // Assuming showNotification is available via context or prop, but here it's not.
                                // Using alert as fallback if needed, but better to just let it be.
                            }
                        }}
                        style={{
                            padding: '12px 20px',
                            background: 'var(--glass-bg)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            width: '100%',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem',
                        }}
                    >
                        Profil Bağlantısını Aç
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QRCodeOverlay;
