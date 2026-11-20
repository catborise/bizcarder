import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PerspectiveCropper from './PerspectiveCropper';
import { warpPerspective } from '../../utils/perspectiveHelper';
import api, { API_URL } from '../../api/axios';
import { resolveApiError } from '../../utils/apiError';
import { useNotification } from '../../context/NotificationContext';
import { queueForSync } from '../../utils/offlineStore';
import { useAuth } from '../../context/AuthContext';
import useCardCamera from '../../hooks/useCardCamera';
import useCardOcr from '../../hooks/useCardOcr';
import { loadDraft, clearDraft, useCardDraft } from '../../hooks/useCardDraft';
import CameraModal from './CameraModal';
import OcrConfirmModal from './OcrConfirmModal';
import DuplicateAlertModal from './DuplicateAlertModal';
import CardMediaSection from './CardMediaSection';
import AddCardStep1 from './AddCardStep1';
import AddCardStep2And3, { AddCardStepper } from './AddCardStep2And3';

const inputStyle = {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--glass-shadow)',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s ease',
};

const AddCard = ({ onCardAdded, activeCard, isPersonal = false }) => {
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const { t } = useTranslation(['cards', 'common']);

    const [src, setSrc] = useState(null);
    const [activeSide, setActiveSide] = useState(null);
    const [frontBlob, setFrontBlob] = useState(null);
    const [backBlob, setBackBlob] = useState(null);
    const [frontPreview, setFrontPreview] = useState(null);
    const [backPreview, setBackPreview] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    const revokePreview = (url) => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    };

    const blobUrlsRef = useRef({ src: null, frontPreview: null, backPreview: null, logoPreview: null });
    blobUrlsRef.current = { src, frontPreview, backPreview, logoPreview };

    useEffect(() => {
        return () => {
            Object.values(blobUrlsRef.current).forEach((url) => {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, []);

    const [logoBlob, setLogoBlob] = useState(null);
    const [logoTempSrc, setLogoTempSrc] = useState(null);
    const [showLogoCrop, setShowLogoCrop] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        company: '',
        title: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        website: '',
        ocrText: '',
        notes: '',
        visibility: 'private',
        reminderDate: '',
        tags: [],
        newTagName: '',
        showNewTagInput: false,
        leadStatus: 'Cold',
        priority: 1,
        source: '',
    });

    const [availableTags, setAvailableTags] = useState([]);
    const [tagsLoading, setTagsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [showMoreFields, setShowMoreFields] = useState(false);

    const [duplicateCard, setDuplicateCard] = useState(null);
    const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
    const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

    const ocr = useCardOcr({ user, showNotification, t });

    const camera = useCardCamera({
        onCapture: async (file, side) => {
            const url = URL.createObjectURL(file);
            setSrc(url);
            setActiveSide(side);
            ocr.setAiDetectedPoints(null);
            ocr.setPreFetchedAiData(null);

            if (user?.aiOcrEnabled) {
                await ocr.detectAiBoundary(file);
            }
        },
    });

    useEffect(() => {
        if (activeCard) {
            setFormData({
                firstName: activeCard.firstName || '',
                lastName: activeCard.lastName || '',
                company: activeCard.company || '',
                title: activeCard.title || '',
                email: activeCard.email || '',
                phone: activeCard.phone || '',
                address: activeCard.address || '',
                city: activeCard.city || '',
                country: activeCard.country || '',
                website: activeCard.website || '',
                ocrText: activeCard.ocrText || '',
                notes: activeCard?.notes || '',
                visibility: activeCard.visibility || 'private',
                reminderDate: activeCard.reminderDate ? activeCard.reminderDate.split('T')[0] : '',
                tags: activeCard.tags ? activeCard.tags.map((tag) => tag.id) : [],
                leadStatus: activeCard.leadStatus || 'Cold',
                priority: activeCard.priority || 1,
                source: activeCard.source || '',
            });
            if (activeCard.frontImageUrl) {
                const fullFrontUrl = `${API_URL}${activeCard.frontImageUrl}`;
                setFrontPreview(fullFrontUrl);
                setLogoTempSrc(fullFrontUrl);
            }
            if (activeCard.backImageUrl) setBackPreview(`${API_URL}${activeCard.backImageUrl}`);
            if (activeCard.logoUrl) setLogoPreview(`${API_URL}${activeCard.logoUrl}`);
        } else {
            const draftData = loadDraft();
            if (draftData) {
                setFormData((prev) => ({ ...prev, ...draftData }));
            }
        }

        fetchTags();
    }, [activeCard]);

    useCardDraft(formData, activeCard);

    useEffect(() => {
        if (activeCard) {
            setShowMoreFields(true);
        }
    }, [activeCard]);

    const fetchTags = async () => {
        setTagsLoading(true);
        try {
            const res = await api.get('/api/tags');
            setAvailableTags(res.data || []);
        } catch (err) {
            console.error('Error fetching tags:', err);
        } finally {
            setTagsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateStep1 = () => {
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            showNotification(t('addCard.validation.nameRequired'), 'error');
            return false;
        }
        if (!formData.email.trim() && !formData.phone.trim()) {
            showNotification(t('addCard.validation.contactRequired'), 'error');
            return false;
        }
        return true;
    };

    const handleNextStep = (e) => {
        if (e) e.preventDefault();
        if (currentStep === 1) {
            if (validateStep1()) {
                setCurrentStep(2);
            }
        } else if (currentStep === 2) {
            setCurrentStep(3);
        }
    };

    const handlePrevStep = (e) => {
        if (e) e.preventDefault();
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleQuickSave = async (e) => {
        if (e) e.preventDefault();
        if (validateStep1()) {
            await handleSubmit(e, false, true);
        }
    };

    const onSelectFile = async (e, side) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setSrc(url);
            setActiveSide(side);
            ocr.setAiDetectedPoints(null);
            ocr.setPreFetchedAiData(null);

            if (user?.aiOcrEnabled) {
                await ocr.detectAiBoundary(file);
            }
            e.target.value = null;
        }
    };

    const handleCropComplete = async (naturalPoints, image) => {
        const topWidth = Math.hypot(naturalPoints[1].x - naturalPoints[0].x, naturalPoints[1].y - naturalPoints[0].y);
        const bottomWidth = Math.hypot(
            naturalPoints[2].x - naturalPoints[3].x,
            naturalPoints[2].y - naturalPoints[3].y,
        );
        const leftHeight = Math.hypot(naturalPoints[3].x - naturalPoints[0].x, naturalPoints[3].y - naturalPoints[0].y);
        const rightHeight = Math.hypot(
            naturalPoints[2].x - naturalPoints[1].x,
            naturalPoints[2].y - naturalPoints[1].y,
        );

        const avgWidth = (topWidth + bottomWidth) / 2;
        const avgHeight = (leftHeight + rightHeight) / 2;
        const ratio = avgWidth / avgHeight;

        let width = 1000;
        let height = Math.round(1000 / ratio);
        let cardType = t('addCard.cardType.custom');

        if (Math.abs(ratio - 1.58) < 0.05) {
            height = 633;
            cardType = t('addCard.cardType.euCredit');
        } else if (Math.abs(ratio - 1.75) < 0.05) {
            height = 571;
            cardType = t('addCard.cardType.us');
        } else if (Math.abs(ratio - 1.0) < 0.1) {
            height = 1000;
            cardType = t('addCard.cardType.square');
        }

        const canvas = warpPerspective(image, naturalPoints, width, height);

        canvas.toBlob(
            (blob) => {
                if (!blob) return;

                const previewUrl = URL.createObjectURL(blob);

                if (activeSide === 'front') {
                    setFrontBlob(blob);
                    revokePreview(frontPreview);
                    setFrontPreview(previewUrl);
                    setLogoTempSrc(previewUrl);
                    ocr.performOCR(blob);
                    showNotification(t('addCard.notify.cardDetected', { cardType }), 'info');
                } else {
                    setBackBlob(blob);
                    revokePreview(backPreview);
                    setBackPreview(previewUrl);
                }

                setSrc(null);
                setActiveSide(null);
            },
            'image/jpeg',
            0.7,
        );
    };

    const handleSubmit = async (e, forceAdd = false, isQuickSave = false) => {
        if (e) e.preventDefault();

        if (currentStep === 1 && !isQuickSave) {
            handleNextStep(e);
            return;
        }

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            showNotification(t('addCard.validation.fillNameFields'), 'error');
            return;
        }

        if (!activeCard && !forceAdd && !ignoreDuplicate) {
            try {
                const dupCheck = await api.get('/api/cards/check-duplicate', {
                    params: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        phone: formData.phone,
                    },
                });

                if (dupCheck.data) {
                    setDuplicateCard(dupCheck.data);
                    setShowDuplicateAlert(true);
                    return;
                }
            } catch (err) {
                console.error('Duplicate check failed:', err);
            }
        }

        const data = new FormData();
        const uiOnlyKeys = new Set(['newTagName', 'showNewTagInput']);
        Object.keys(formData).forEach((key) => {
            if (uiOnlyKeys.has(key)) return;
            if (key === 'tags') {
                data.append(key, JSON.stringify(formData[key]));
            } else {
                data.append(key, formData[key]);
            }
        });

        if (frontBlob) data.append('frontImage', frontBlob, 'front.jpg');
        if (backBlob) data.append('backImage', backBlob, 'back.jpg');
        if (logoBlob) data.append('logoImage', logoBlob, 'logo.jpg');

        if (isPersonal) {
            data.append('isPersonal', 'true');
            data.set('visibility', 'public');
        }

        try {
            if (!navigator.onLine) {
                const offlineData = {
                    ...formData,
                    frontBlob,
                    backBlob,
                    logoBlob,
                    isPersonal,
                    tags: formData.tags,
                    reminderDate: formData.reminderDate,
                };
                await queueForSync('CREATE_CARD', offlineData);
                showNotification(t('addCard.notify.offlineQueued'), 'info');
                if (onCardAdded) onCardAdded();
                return;
            }

            if (activeCard) {
                await api.put(`/api/cards/${activeCard.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                showNotification(t('addCard.notify.updated'), 'success');
            } else {
                await api.post('/api/cards', data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                showNotification(t('addCard.notify.created'), 'success');
            }

            clearDraft();
            if (onCardAdded) onCardAdded();
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            showNotification(
                t('addCard.notify.saveFailed', { error: resolveApiError(error, '') || error.message }),
                'error',
            );
        }
    };

    const primaryBtnStyle = {
        padding: '14px 24px',
        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
        color: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px',
        fontSize: '16px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'all 0.2s ease',
        boxShadow: 'var(--glass-shadow)',
    };

    const secondaryBtnStyle = {
        padding: '14px 24px',
        background: 'var(--glass-bg)',
        color: 'var(--text-primary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px',
        fontSize: '16px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'all 0.2s ease',
        boxShadow: 'var(--glass-shadow)',
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0', color: 'var(--text-primary)' }}>
            {src && (
                <div
                    style={{
                        marginBottom: '25px',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(5px)',
                        border: '1px solid var(--glass-border)',
                        padding: '20px',
                        borderRadius: '16px',
                        boxShadow: 'var(--glass-shadow)',
                        position: 'relative',
                    }}
                >
                    <h4 style={{ margin: '0 0 15px 0', fontWeight: '600', fontSize: '1.1rem' }}>
                        {t('addCard.perspectiveCorrection', {
                            side: activeSide === 'front' ? t('addCard.frontSide') : t('addCard.backSide'),
                        })}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>
                        {t('addCard.perspectiveHint')}
                    </p>

                    {ocr.isDetecting && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '60px',
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 100,
                                borderRadius: '16px',
                            }}
                        >
                            <div className="spinner" style={{ marginBottom: '10px' }} />
                            <p style={{ color: 'white', fontWeight: 'bold' }}>{t('addCard.ai.detecting')}</p>
                        </div>
                    )}

                    <PerspectiveCropper
                        key={src}
                        src={src}
                        onCropComplete={handleCropComplete}
                        initialPoints={ocr.aiDetectedPoints}
                    />
                </div>
            )}

            <form onSubmit={handleSubmit} className="addcard-form" style={{ display: 'grid', gap: '25px' }}>
                <CardMediaSection
                    t={t}
                    frontPreview={frontPreview}
                    backPreview={backPreview}
                    logoPreview={logoPreview}
                    setShowLogoCrop={setShowLogoCrop}
                    onSelectFile={onSelectFile}
                    openCamera={camera.openCamera}
                    ocrLoading={ocr.ocrLoading}
                />

                <div style={{ height: '1px', background: 'var(--glass-border)' }} />

                <AddCardStepper t={t} currentStep={currentStep} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {currentStep === 1 ? (
                        <AddCardStep1
                            t={t}
                            formData={formData}
                            setFormData={setFormData}
                            handleInputChange={handleInputChange}
                            showMoreFields={showMoreFields}
                            setShowMoreFields={setShowMoreFields}
                            showNotification={showNotification}
                            inputStyle={inputStyle}
                        />
                    ) : (
                        <AddCardStep2And3
                            t={t}
                            currentStep={currentStep}
                            formData={formData}
                            setFormData={setFormData}
                            handleInputChange={handleInputChange}
                            availableTags={availableTags}
                            setAvailableTags={setAvailableTags}
                            tagsLoading={tagsLoading}
                            showNotification={showNotification}
                            inputStyle={inputStyle}
                        />
                    )}
                </div>

                <div
                    className="addcard-nav-buttons"
                    style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}
                >
                    {currentStep === 1 ? (
                        <>
                            <button
                                type="button"
                                onClick={handleQuickSave}
                                disabled={ocr.ocrLoading}
                                style={secondaryBtnStyle}
                            >
                                {t('common:save')}
                            </button>
                            <button
                                type="button"
                                onClick={handleNextStep}
                                disabled={ocr.ocrLoading}
                                style={primaryBtnStyle}
                            >
                                {t('common:next')}
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={handlePrevStep} style={secondaryBtnStyle}>
                                {t('common:back')}
                            </button>
                            {currentStep === 2 ? (
                                <button type="button" onClick={handleNextStep} style={primaryBtnStyle}>
                                    {t('common:next')}
                                </button>
                            ) : (
                                <button type="submit" disabled={ocr.ocrLoading} style={primaryBtnStyle}>
                                    {activeCard ? t('common:update') : t('common:save')}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </form>

            <OcrConfirmModal
                isOpen={ocr.showOcrConfirm}
                onClose={() => ocr.setShowOcrConfirm(false)}
                ocrResults={ocr.ocrResults}
                onConfirm={(fields) => {
                    setFormData((prev) => ({ ...prev, ...fields }));
                    ocr.setShowOcrConfirm(false);
                    showNotification(t('addCard.notify.ocrApplied'), 'success');
                }}
                t={t}
            />

            {showLogoCrop && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 3000,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                >
                    <div
                        style={{
                            background: 'var(--bg-card)',
                            padding: '25px',
                            borderRadius: '24px',
                            border: '1px solid var(--glass-border)',
                            maxWidth: '90%',
                            maxHeight: '90%',
                            overflow: 'auto',
                            boxShadow: 'var(--glass-shadow-hover)',
                        }}
                    >
                        <h4 style={{ color: 'var(--text-primary)', marginTop: 0 }}>{t('addCard.logoCrop.title')}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>
                            {t('addCard.logoCrop.hint')}
                        </p>
                        <PerspectiveCropper
                            src={logoTempSrc}
                            onCropComplete={async (points, image) => {
                                const canvas = warpPerspective(image, points, 400, 400);
                                canvas.toBlob((blob) => {
                                    setLogoBlob(blob);
                                    revokePreview(logoPreview);
                                    setLogoPreview(URL.createObjectURL(blob));
                                    setShowLogoCrop(false);
                                }, 'image/png');
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowLogoCrop(false)}
                            style={{
                                marginTop: '15px',
                                padding: '10px 20px',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            {t('common:cancel')}
                        </button>
                    </div>
                </div>
            )}

            <DuplicateAlertModal
                isOpen={showDuplicateAlert}
                onClose={() => setShowDuplicateAlert(false)}
                duplicateCard={duplicateCard}
                onUpdateExisting={() => {
                    if (onCardAdded) onCardAdded(duplicateCard);
                    setShowDuplicateAlert(false);
                    showNotification(t('addCard.notify.editMode'), 'info');
                }}
                onCreateAnyway={() => {
                    setIgnoreDuplicate(true);
                    setShowDuplicateAlert(false);
                    handleSubmit(null, true, currentStep === 1);
                }}
                t={t}
            />

            <CameraModal
                isOpen={camera.showCameraModal}
                onClose={camera.closeCamera}
                videoRef={camera.videoRef}
                cameraReady={camera.cameraReady}
                cameraError={camera.cameraError}
                onCapture={camera.capturePhoto}
                cameraSide={camera.cameraSide}
                fallbackToFileInput={camera.fallbackToFileInput}
                t={t}
            />
        </div>
    );
};

export default AddCard;
