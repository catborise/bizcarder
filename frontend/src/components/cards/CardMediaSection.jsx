const CardMediaSection = ({
    t,
    frontPreview,
    backPreview,
    logoPreview,
    setShowLogoCrop,
    onSelectFile,
    openCamera,
    ocrLoading,
}) => {
    return (
        <div className="addcard-image-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Ön Yüz */}
            <div
                className="addcard-image-box"
                style={{
                    border: '1px dashed var(--glass-border)',
                    padding: '15px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    background: 'var(--glass-bg)',
                    minHeight: '160px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                }}
            >
                <h4 style={{ marginTop: 0, marginBottom: '12px', fontWeight: '600' }}>{t('addCard.frontSide')}</h4>
                {frontPreview ? (
                    <div style={{ position: 'relative' }}>
                        <img
                            src={frontPreview}
                            alt={t('addCard.frontSide')}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '150px',
                                objectFit: 'contain',
                                borderRadius: '8px',
                            }}
                        />
                        <div
                            className="image-action-buttons"
                            style={{
                                display: 'flex',
                                gap: '5px',
                                position: 'absolute',
                                bottom: '8px',
                                right: '8px',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setShowLogoCrop(true)}
                                style={{
                                    fontSize: '13px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    background: 'var(--accent-success)',
                                    backdropFilter: 'blur(5px)',
                                    color: 'var(--bg-card)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                }}
                            >
                                {logoPreview ? t('addCard.btn.changeLogo') : t('addCard.btn.selectLogo')}
                            </button>
                            <button
                                type="button"
                                onClick={() => document.getElementById('frontInput').click()}
                                style={{
                                    fontSize: '13px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    background: 'var(--bg-card)',
                                    backdropFilter: 'blur(5px)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                }}
                            >
                                {t('addCard.btn.select')}
                            </button>
                            <button
                                type="button"
                                onClick={() => openCamera('front')}
                                style={{
                                    fontSize: '13px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    background: 'var(--accent-primary)',
                                    color: 'var(--bg-card)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                }}
                            >
                                {t('addCard.btn.camera')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                            onClick={() => document.getElementById('frontInput').click()}
                            style={{
                                cursor: 'pointer',
                                height: '80px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--glass-bg)',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                transition: 'all 0.2s ease',
                                fontSize: '14px',
                            }}
                        >
                            <span>{t('addCard.btn.selectFile')}</span>
                        </div>
                        <div
                            onClick={() => openCamera('front')}
                            style={{
                                cursor: 'pointer',
                                height: '80px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--accent-primary)',
                                color: 'var(--bg-card)',
                                borderRadius: '12px',
                                transition: 'all 0.2s ease',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}
                        >
                            <span>{t('addCard.btn.captureFromCamera')}</span>
                        </div>
                    </div>
                )}
                <input
                    id="frontInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => onSelectFile(e, 'front')}
                    style={{ display: 'none' }}
                />
                <input
                    id="frontCamera"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => onSelectFile(e, 'front')}
                    style={{ display: 'none' }}
                />
                {ocrLoading && (
                    <p
                        style={{
                            color: 'var(--accent-warning)',
                            fontSize: '13px',
                            marginTop: '8px',
                            fontWeight: '500',
                        }}
                    >
                        {t('addCard.ocr.reading')}
                    </p>
                )}
            </div>

            {/* Arka Yüz */}
            <div
                className="addcard-image-box"
                style={{
                    border: '1px dashed var(--glass-border)',
                    padding: '15px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    background: 'var(--glass-bg)',
                    minHeight: '160px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}
            >
                <h4 style={{ marginTop: 0, marginBottom: '12px', fontWeight: '600' }}>{t('addCard.backSide')}</h4>
                {backPreview ? (
                    <div style={{ position: 'relative' }}>
                        <img
                            src={backPreview}
                            alt={t('addCard.backSide')}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '150px',
                                objectFit: 'contain',
                                borderRadius: '8px',
                            }}
                        />
                        <div
                            className="image-action-buttons"
                            style={{
                                display: 'flex',
                                gap: '5px',
                                position: 'absolute',
                                bottom: '8px',
                                right: '8px',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => document.getElementById('backInput').click()}
                                style={{
                                    fontSize: '13px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    background: 'var(--bg-card)',
                                    backdropFilter: 'blur(5px)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                }}
                            >
                                {t('addCard.btn.select')}
                            </button>
                            <button
                                type="button"
                                onClick={() => openCamera('back')}
                                style={{
                                    fontSize: '13px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    background: 'var(--accent-primary)',
                                    color: 'var(--bg-card)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                }}
                            >
                                {t('addCard.btn.camera')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                            onClick={() => document.getElementById('backInput').click()}
                            style={{
                                cursor: 'pointer',
                                height: '80px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--glass-bg)',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                transition: 'all 0.2s ease',
                                fontSize: '14px',
                            }}
                        >
                            <span>{t('addCard.btn.selectFile')}</span>
                        </div>
                        <div
                            onClick={() => openCamera('back')}
                            style={{
                                cursor: 'pointer',
                                height: '80px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--accent-primary)',
                                color: 'var(--bg-card)',
                                borderRadius: '12px',
                                transition: 'all 0.2s ease',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}
                        >
                            <span>{t('addCard.btn.captureFromCamera')}</span>
                        </div>
                    </div>
                )}
                <input
                    id="backInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => onSelectFile(e, 'back')}
                    style={{ display: 'none' }}
                />
                <input
                    id="backCamera"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => onSelectFile(e, 'back')}
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};

export default CardMediaSection;
