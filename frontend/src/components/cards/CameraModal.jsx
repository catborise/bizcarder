/**
 * CameraModal
 *
 * Full-screen camera capture overlay. Uses its own fixed backdrop (not the shared
 * Modal component) because it needs a near-black, full-screen camera viewfinder
 * rather than a standard dialog box.
 */
export default function CameraModal({
    isOpen,
    onClose,
    videoRef,
    cameraReady,
    cameraError,
    onCapture,
    cameraSide,
    fallbackToFileInput,
    t,
}) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.95)',
                zIndex: 5000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '640px',
                    aspectRatio: '4/3',
                    background: 'black',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '2px solid var(--accent-primary)',
                }}
            >
                {/* Video element - muted gerekli (iOS autoplay policy) */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: cameraReady ? 'block' : 'none',
                    }}
                />

                {/* Kamera yüklenirken göster */}
                {!cameraReady && !cameraError && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        }}
                    >
                        <div className="spinner" style={{ marginBottom: '12px' }}></div>
                        <p style={{ fontSize: '14px', fontWeight: '500' }}>{t('addCard.camera.starting')}</p>
                    </div>
                )}

                {/* Kamera hatası göster */}
                {cameraError && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            padding: '20px',
                            textAlign: 'center',
                        }}
                    >
                        <p style={{ fontSize: '40px', marginBottom: '10px' }}>
                            {cameraError === 'permission' ? '🔒' : cameraError === 'not-found' ? '📷' : '⚠️'}
                        </p>
                        <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>
                            {cameraError === 'permission' && t('addCard.cameraError.permission')}
                            {cameraError === 'not-found' && t('addCard.cameraError.notFound')}
                            {cameraError === 'in-use' && t('addCard.cameraError.inUse')}
                            {cameraError === 'no-support' && t('addCard.cameraError.noSupport')}
                            {cameraError === 'unknown' && t('addCard.cameraError.unknown')}
                        </p>
                        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '16px' }}>
                            {cameraError === 'permission'
                                ? t('addCard.cameraError.permissionHint')
                                : t('addCard.cameraError.fallbackHint')}
                        </p>
                        <button
                            type="button"
                            onClick={() => fallbackToFileInput(cameraSide)}
                            style={{
                                padding: '10px 24px',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            {t('addCard.btn.selectFromFile')}
                        </button>
                    </div>
                )}

                {/* Vizör Çerçevesi - sadece kamera hazırken göster */}
                {cameraReady && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '85%',
                            height: '60%',
                            border: '2px dashed var(--accent-primary)',
                            borderRadius: '12px',
                            pointerEvents: 'none',
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top: '-30px',
                                left: 0,
                                right: 0,
                                textAlign: 'center',
                                color: 'var(--accent-primary)',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}
                        >
                            {t('addCard.camera.alignCard')}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        padding: '12px 24px',
                        background: 'white',
                        color: 'black',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    {t('common:cancel')}
                </button>
                <button
                    type="button"
                    onClick={onCapture}
                    disabled={!cameraReady}
                    style={{
                        padding: '12px 40px',
                        background: cameraReady ? 'var(--accent-primary)' : '#555',
                        color: 'white',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: cameraReady ? 'pointer' : 'not-allowed',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        opacity: cameraReady ? 1 : 0.5,
                    }}
                >
                    {t('addCard.btn.takePhoto')}
                </button>
            </div>
        </div>
    );
}
