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
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {/* Modal */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'rgba(30, 30, 30, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '16px',
                        padding: '30px',
                        maxWidth: '450px',
                        width: '90%',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        animation: 'modalFadeIn 0.2s ease-out'
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
                            background: 'rgba(255, 107, 107, 0.2)',
                            border: '2px solid rgba(255, 107, 107, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FaExclamationTriangle size={28} color="#ff6b6b" />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 style={{
                        margin: '0 0 15px 0',
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: 'white',
                        textAlign: 'center'
                    }}>
                        {title || 'Emin misiniz?'}
                    </h3>

                    {/* Message */}
                    <p style={{
                        margin: '0 0 30px 0',
                        fontSize: '1rem',
                        color: 'rgba(255, 255, 255, 0.7)',
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
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
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
                                background: 'rgba(220, 53, 69, 0.8)',
                                backdropFilter: 'blur(10px)',
                                color: 'white',
                                border: '1px solid rgba(220, 53, 69, 0.4)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(220, 53, 69, 1)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(220, 53, 69, 0.8)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
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
