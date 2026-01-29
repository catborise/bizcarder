import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '30px',
                borderRadius: '20px',
                maxWidth: '850px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                animation: 'fadeIn 0.3s ease'
            }} onClick={e => e.stopPropagation()}>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '25px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    paddingBottom: '15px'
                }}>
                    <h3 style={{
                        margin: 0,
                        color: 'white',
                        fontSize: '1.6rem',
                        fontWeight: '600',
                        letterSpacing: '-0.02em'
                    }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(5px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            fontSize: '28px',
                            cursor: 'pointer',
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: '1',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'rotate(90deg)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.transform = 'rotate(0deg)';
                        }}
                    >
                        &times;
                    </button>
                </div>

                <div style={{ color: 'white' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
