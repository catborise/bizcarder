import { FaExclamationTriangle } from 'react-icons/fa';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease'
                }}
                onClick={onClose}
            >
                {/* Modal */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'var(--bg-card)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '20px',
                        padding: '30px',
                        maxWidth: '450px',
                        width: '90%',
                        boxShadow: 'var(--glass-shadow)',
                        animation: 'fadeIn 0.3s ease'
                    }}
                >
                    {/* Icon */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'rgba(var(--accent-error-rgb), 0.1)',
                            border: '2px solid var(--accent-error)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FaExclamationTriangle size={28} color="var(--accent-error)" />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 style={{
                        margin: '0 0 15px 0',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        letterSpacing: '-0.02em'
                    }}>
                        {title || 'Emin misiniz?'}
                    </h3>

                    {/* Message */}
                    <p style={{
                        margin: '0 0 30px 0',
                        fontSize: '1rem',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        lineHeight: '1.5'
                    }}>
                        {message || 'Bu işlem geri alınamaz.'}
                    </p>

                    {/* Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'center'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px 24px',
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(10px)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--glass-bg-hover)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--glass-bg)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            İptal
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            style={{
                                flex: 1,
                                padding: '12px 24px',
                                background: 'var(--accent-error)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 12px rgba(var(--accent-error-rgb), 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(var(--accent-error-rgb), 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--accent-error-rgb), 0.2)';
                            }}
                        >
                            Evet, Sil
                        </button>
                    </div>
                </div>
            </div>


            <style>{`
                @keyframes modalFadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `}</style>
        </>
    );
};

export default ConfirmModal;
