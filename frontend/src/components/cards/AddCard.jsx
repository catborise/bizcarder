import { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import PerspectiveCropper from './PerspectiveCropper';
import { warpPerspective } from '../../utils/perspectiveHelper';
import api, { API_URL } from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { queueForSync } from '../../utils/offlineStore';
import { useAuth } from '../../context/AuthContext';
import useCardCamera from '../../hooks/useCardCamera';
import useCardOcr from '../../hooks/useCardOcr';
import { loadDraft, clearDraft, useCardDraft } from '../../hooks/useCardDraft';
import CameraModal from './CameraModal';
import OcrConfirmModal from './OcrConfirmModal';
import DuplicateAlertModal from './DuplicateAlertModal';

const AddCard = ({ onCardAdded, activeCard, isPersonal = false }) => {
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const { t } = useTranslation(['cards', 'common']);

    // Seçilen Ham Dosyalar
    const [src, setSrc] = useState(null); // Şu an kırpılmakta olan resim kaynağı
    const [activeSide, setActiveSide] = useState(null); // 'front' veya 'back'

    // Kırpılmış Bloblar (Sunucuya gidecek - sadece yeni resim seçilirse)
    const [frontBlob, setFrontBlob] = useState(null);
    const [backBlob, setBackBlob] = useState(null);

    // Önizleme URL'leri (UI için)
    const [frontPreview, setFrontPreview] = useState(null);
    const [backPreview, setBackPreview] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    const revokePreview = (url) => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    };

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            [frontPreview, backPreview, logoPreview].forEach((url) => {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [logoBlob, setLogoBlob] = useState(null);
    const [logoTempSrc, setLogoTempSrc] = useState(null); // Logo kırpmak için kullanılan kaynak resim
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
    const [currentStep, setCurrentStep] = useState(1); // Wizard step: 1 or 2
    const [showMoreFields, setShowMoreFields] = useState(false);

    const [duplicateCard, setDuplicateCard] = useState(null);
    const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
    const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

    // OCR — state ve mantık useCardOcr hook'unda
    const ocr = useCardOcr({ user, showNotification, t });

    // Kamera — tüm durum ve mantık useCardCamera hook'unda
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

    // Düzenleme Modu: Verileri Yükle
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
                tags: activeCard.tags ? activeCard.tags.map((t) => t.id) : [],
                leadStatus: activeCard.leadStatus || 'Cold',
                priority: activeCard.priority || 1,
                source: activeCard.source || '',
            });
            // Var olan resimleri göster
            if (activeCard.frontImageUrl) setFrontPreview(`${API_URL}${activeCard.frontImageUrl}`);
            if (activeCard.backImageUrl) setBackPreview(`${API_URL}${activeCard.backImageUrl}`);
            if (activeCard.logoUrl) setLogoPreview(`${API_URL}${activeCard.logoUrl}`);
        } else {
            // Yeni kart ekleme modundaysak taslağı yükle
            const draftData = loadDraft();
            if (draftData) {
                setFormData((prev) => ({ ...prev, ...draftData }));
            }
        }

        fetchTags();
    }, [activeCard]);

    // Auto-save draft via hook
    useCardDraft(formData, activeCard);

    // Düzenleme modunda ikincil alanları otomatik göster
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

    // Wizard Step Navigation
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
            await handleSubmit(e, false, true); // forceAdd=false, isQuickSave=true
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
            e.target.value = null; // Clear the input so the same file can be selected again
        }
    };

    const handleCropComplete = async (naturalPoints, image) => {
        // Calculate aspect ratio of selected area
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

        // Determine best fit standard dimensions
        let width = 1000;
        let height = Math.round(1000 / ratio);
        let cardType = t('addCard.cardType.custom');

        if (Math.abs(ratio - 1.58) < 0.05) {
            height = 633; // 85.6 x 53.98 (CR80)
            cardType = t('addCard.cardType.euCredit');
        } else if (Math.abs(ratio - 1.75) < 0.05) {
            height = 571; // 3.5 x 2 (US)
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
        ); // Client-side sıkıştırma eklendi (0.7 kalite)
    };

    const handleSubmit = async (e, forceAdd = false, isQuickSave = false) => {
        if (e) e.preventDefault();

        // Eğer Step 1'deysek ve Quick Save değilse, sadece Next Step'e yönlendir
        if (currentStep === 1 && !isQuickSave) {
            handleNextStep(e);
            return;
        }

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            showNotification(t('addCard.validation.fillNameFields'), 'error');
            return;
        }

        // Mükerrer Kontrolü (Sadece yeni kart eklerken ve henüz zorlanmadıysa)
        if (!activeCard && !forceAdd && !ignoreDuplicate) {
            try {
                const dupCheck = await api.get(`/api/cards/check-duplicate`, {
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
        Object.keys(formData).forEach((key) => {
            if (key === 'tags') {
                data.append(key, JSON.stringify(formData[key]));
            } else {
                data.append(key, formData[key]);
            }
        });

        if (frontBlob) data.append('frontImage', frontBlob, 'front.jpg');
        if (backBlob) data.append('backImage', backBlob, 'back.jpg');
        if (logoBlob) data.append('logoImage', logoBlob, 'logo.jpg');

        // Kişisel kart ise flag ekle
        if (isPersonal) {
            data.append('isPersonal', 'true');
            data.set('visibility', 'public'); // Kişisel kartlar varsayılan olarak public (paylaşım için)
        }

        try {
            if (!navigator.onLine) {
                // Handle Offline Submission
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
                // GÜNCELLEME (PUT)
                await api.put(`/api/cards/${activeCard.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                showNotification(t('addCard.notify.updated'), 'success');
            } else {
                // YENİ EKLEME (POST)
                await api.post('/api/cards', data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                showNotification(t('addCard.notify.created'), 'success');
            }

            // Başarılı işlem sonrası taslağı temizle
            clearDraft();

            if (onCardAdded) onCardAdded();

            // Form Reset (Eğer modal kapanmıyorsa manuel sıfırlama gerekebilir ama modal kapanacağı için sorun yok)
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            showNotification(
                t('addCard.notify.saveFailed', { error: error.response?.data?.error || error.message }),
                'error',
            );
        }
    };

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
                        textAlign: 'center',
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
                            <div className="spinner" style={{ marginBottom: '10px' }}></div>
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
                <div
                    className="addcard-image-grid"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
                >
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
                        <h4 style={{ marginTop: 0, marginBottom: '12px', fontWeight: '600' }}>
                            {t('addCard.frontSide')}
                        </h4>
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
                                        onClick={(_e) => document.getElementById('frontInput').click()}
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
                                        onClick={(_e) => camera.openCamera('front')}
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
                                    onClick={() => camera.openCamera('front')}
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
                        {ocr.ocrLoading && (
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
                        <h4 style={{ marginTop: 0, marginBottom: '12px', fontWeight: '600' }}>
                            {t('addCard.backSide')}
                        </h4>
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
                                        onClick={(_e) => document.getElementById('backInput').click()}
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
                                        onClick={(_e) => camera.openCamera('back')}
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
                                    onClick={() => camera.openCamera('back')}
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

                <div style={{ height: '1px', background: 'var(--glass-border)' }}></div>

                {/* Progress Indicator */}
                <div
                    className="addcard-steps"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        padding: '20px 0',
                        marginBottom: '10px',
                    }}
                >
                    {/* Step 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                            className="step-circle"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: currentStep >= 1 ? 'var(--accent-primary)' : 'var(--glass-bg)',
                                border:
                                    currentStep >= 1
                                        ? '2px solid var(--accent-primary)'
                                        : '2px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: currentStep >= 1 ? 'var(--bg-card)' : 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '14px',
                            }}
                        >
                            1
                        </div>
                        <span
                            className="step-label"
                            style={{
                                color: currentStep >= 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '14px',
                            }}
                        >
                            {t('addCard.step.basic')}
                        </span>
                    </div>

                    <div
                        className="step-line"
                        style={{
                            width: '40px',
                            height: '2px',
                            background: currentStep >= 2 ? 'var(--accent-primary)' : 'var(--glass-border)',
                        }}
                    ></div>

                    {/* Step 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                            className="step-circle"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: currentStep >= 2 ? 'var(--accent-primary)' : 'var(--glass-bg)',
                                border:
                                    currentStep >= 2
                                        ? '2px solid var(--accent-primary)'
                                        : '2px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: currentStep >= 2 ? 'var(--bg-card)' : 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '14px',
                            }}
                        >
                            2
                        </div>
                        <span
                            className="step-label"
                            style={{
                                color: currentStep >= 2 ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '14px',
                            }}
                        >
                            {t('addCard.step.detail')}
                        </span>
                    </div>

                    <div
                        className="step-line"
                        style={{
                            width: '40px',
                            height: '2px',
                            background: currentStep >= 3 ? 'var(--accent-primary)' : 'var(--glass-border)',
                        }}
                    ></div>

                    {/* Step 3 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                            className="step-circle"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: currentStep >= 3 ? 'var(--accent-primary)' : 'var(--glass-bg)',
                                border:
                                    currentStep >= 3
                                        ? '2px solid var(--accent-primary)'
                                        : '2px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: currentStep >= 3 ? 'var(--bg-card)' : 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '14px',
                            }}
                        >
                            3
                        </div>
                        <span
                            className="step-label"
                            style={{
                                color: currentStep >= 3 ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '14px',
                            }}
                        >
                            {t('addCard.step.lead')}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Step 1: Basic Information */}
                    {currentStep === 1 && (
                        <>
                            {/* Native Contact Picker Integration */}
                            {'contacts' in navigator && 'ContactsManager' in window && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const props = ['name', 'email', 'tel'];
                                            const opts = { multiple: false };
                                            const contacts = await navigator.contacts.select(props, opts);
                                            if (contacts.length > 0) {
                                                const contact = contacts[0];
                                                const names = contact.name[0]?.split(' ') || [];
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    firstName: names.slice(0, -1).join(' ') || contact.name[0] || '',
                                                    lastName: names[names.length - 1] || '',
                                                    email: contact.email[0] || '',
                                                    phone: contact.tel[0] || '',
                                                }));
                                                showNotification(t('addCard.notify.contactImported'), 'success');
                                            }
                                        } catch (err) {
                                            console.error('Contact Picker Error:', err);
                                        }
                                    }}
                                    style={{
                                        padding: '10px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        borderRadius: '12px',
                                        color: '#60a5fa',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    {t('addCard.btn.importFromContacts')}
                                </button>
                            )}

                            {/* Temel Bilgiler */}
                            <div
                                className="addcard-form-grid"
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                            >
                                <input
                                    type="text"
                                    name="firstName"
                                    placeholder={t('addCard.placeholder.firstName')}
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    onFocus={(e) => {
                                        e.target.style.background = 'var(--glass-bg-hover)';
                                        e.target.style.borderColor = 'var(--accent-primary)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'var(--bg-card)';
                                        e.target.style.borderColor = 'var(--glass-border)';
                                    }}
                                    required
                                />
                                <input
                                    type="text"
                                    name="lastName"
                                    placeholder={t('addCard.placeholder.lastName')}
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    onFocus={(e) => {
                                        e.target.style.background = 'var(--glass-bg-hover)';
                                        e.target.style.borderColor = 'var(--accent-primary)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'var(--bg-card)';
                                        e.target.style.borderColor = 'var(--glass-border)';
                                    }}
                                    required
                                />
                            </div>

                            <div
                                className="addcard-form-grid"
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                            >
                                <input
                                    type="text"
                                    name="company"
                                    placeholder={t('addCard.placeholder.company')}
                                    value={formData.company}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    onFocus={(e) => {
                                        e.target.style.background = 'var(--glass-bg-hover)';
                                        e.target.style.borderColor = 'var(--accent-primary)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'var(--bg-card)';
                                        e.target.style.borderColor = 'var(--glass-border)';
                                    }}
                                />
                                <input
                                    type="text"
                                    name="title"
                                    placeholder={t('addCard.placeholder.title')}
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    onFocus={(e) => {
                                        e.target.style.background = 'var(--glass-bg-hover)';
                                        e.target.style.borderColor = 'var(--accent-primary)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'var(--bg-card)';
                                        e.target.style.borderColor = 'var(--glass-border)';
                                    }}
                                />
                            </div>

                            {/* İletişim Bilgileri */}
                            <div
                                className="addcard-form-grid"
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                            >
                                <input
                                    type="email"
                                    name="email"
                                    placeholder={t('addCard.placeholder.email')}
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    onFocus={(e) => {
                                        e.target.style.background = 'var(--glass-bg-hover)';
                                        e.target.style.borderColor = 'var(--accent-primary)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'var(--bg-card)';
                                        e.target.style.borderColor = 'var(--glass-border)';
                                    }}
                                />
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder={t('addCard.placeholder.phone')}
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    onFocus={(e) => {
                                        e.target.style.background = 'var(--glass-bg-hover)';
                                        e.target.style.borderColor = 'var(--accent-primary)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = 'var(--bg-card)';
                                        e.target.style.borderColor = 'var(--glass-border)';
                                    }}
                                />
                            </div>
                            <p
                                style={{
                                    fontSize: '12px',
                                    color: 'var(--text-tertiary)',
                                    margin: '-10px 0 0 0',
                                    fontStyle: 'italic',
                                }}
                            >
                                {t('addCard.hint.contactRequired')}
                            </p>

                            {/* Toggle for secondary fields */}
                            <button
                                type="button"
                                onClick={() => setShowMoreFields(!showMoreFields)}
                                className="glass-button"
                                style={{
                                    width: '100%',
                                    justifyContent: 'center',
                                    marginTop: 'var(--space-2)',
                                    marginBottom: 'var(--space-2)',
                                    fontSize: '0.85rem',
                                }}
                            >
                                {showMoreFields ? t('cards:addCard.showLess') : t('cards:addCard.showMore')}
                                <span
                                    style={{
                                        marginLeft: '6px',
                                        transition: 'transform 0.2s',
                                        transform: showMoreFields ? 'rotate(180deg)' : 'rotate(0deg)',
                                    }}
                                >
                                    ▼
                                </span>
                            </button>

                            {showMoreFields && (
                                <div
                                    className="addcard-form-grid"
                                    style={{
                                        animation: 'fadeIn 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                    }}
                                >
                                    {/* Web Sitesi */}
                                    <input
                                        type="text"
                                        name="website"
                                        placeholder={t('addCard.placeholder.website')}
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                        onFocus={(e) => {
                                            e.target.style.background = 'var(--glass-bg-hover)';
                                            e.target.style.borderColor = 'var(--accent-primary)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.background = 'var(--bg-card)';
                                            e.target.style.borderColor = 'var(--glass-border)';
                                        }}
                                    />

                                    {/* Adres Bilgileri Grubu */}
                                    <fieldset
                                        style={{
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '12px',
                                            padding: '15px',
                                            margin: 0,
                                            background: 'var(--glass-bg)',
                                        }}
                                    >
                                        <legend
                                            style={{
                                                padding: '0 8px',
                                                color: 'var(--text-secondary)',
                                                fontSize: '0.95em',
                                                fontWeight: '500',
                                            }}
                                        >
                                            {t('addCard.label.addressInfo')}
                                        </legend>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <textarea
                                                name="address"
                                                rows="2"
                                                placeholder={t('addCard.placeholder.address')}
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                style={{
                                                    ...inputStyle,
                                                    width: '100%',
                                                    fontFamily: 'inherit',
                                                    boxSizing: 'border-box',
                                                    resize: 'vertical',
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.background = 'var(--glass-bg-hover)';
                                                    e.target.style.borderColor = 'var(--accent-primary)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.background = 'var(--bg-card)';
                                                    e.target.style.borderColor = 'var(--glass-border)';
                                                }}
                                            ></textarea>
                                            <div
                                                className="addcard-form-grid"
                                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                                            >
                                                <input
                                                    type="text"
                                                    name="city"
                                                    placeholder={t('addCard.placeholder.city')}
                                                    value={formData.city}
                                                    onChange={handleInputChange}
                                                    style={inputStyle}
                                                    onFocus={(e) => {
                                                        e.target.style.background = 'var(--glass-bg-hover)';
                                                        e.target.style.borderColor = 'var(--accent-primary)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.background = 'var(--bg-card)';
                                                        e.target.style.borderColor = 'var(--glass-border)';
                                                    }}
                                                />
                                                <input
                                                    type="text"
                                                    name="country"
                                                    placeholder={t('addCard.placeholder.country')}
                                                    value={formData.country}
                                                    onChange={handleInputChange}
                                                    style={inputStyle}
                                                    onFocus={(e) => {
                                                        e.target.style.background = 'var(--glass-bg-hover)';
                                                        e.target.style.borderColor = 'var(--accent-primary)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.background = 'var(--bg-card)';
                                                        e.target.style.borderColor = 'var(--glass-border)';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </fieldset>

                                    {/* Notlar */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label
                                            style={{
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            {t('addCard.label.notes')}
                                        </label>
                                        <textarea
                                            name="notes"
                                            rows="3"
                                            placeholder={t('addCard.placeholder.notes')}
                                            value={formData.notes}
                                            onChange={handleInputChange}
                                            style={{
                                                ...inputStyle,
                                                width: '100%',
                                                fontFamily: 'inherit',
                                                boxSizing: 'border-box',
                                                resize: 'vertical',
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.background = 'var(--glass-bg-hover)';
                                                e.target.style.borderColor = 'var(--accent-primary)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.background = 'var(--bg-card)';
                                                e.target.style.borderColor = 'var(--glass-border)';
                                            }}
                                        />
                                    </div>

                                    {/* OCR Metni */}
                                    {formData.ocrText && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label
                                                style={{
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    color: 'var(--text-secondary)',
                                                }}
                                            >
                                                {t('cards:addCard.label.ocrText')}
                                            </label>
                                            <textarea
                                                name="ocrText"
                                                rows="3"
                                                placeholder={t('cards:addCard.placeholder.ocrText')}
                                                value={formData.ocrText}
                                                onChange={handleInputChange}
                                                style={{
                                                    ...inputStyle,
                                                    width: '100%',
                                                    fontFamily: 'inherit',
                                                    boxSizing: 'border-box',
                                                    resize: 'vertical',
                                                    fontSize: '12px',
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.background = 'var(--glass-bg-hover)';
                                                    e.target.style.borderColor = 'var(--accent-primary)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.background = 'var(--bg-card)';
                                                    e.target.style.borderColor = 'var(--glass-border)';
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Step 2: Detailed Information */}
                    {currentStep === 2 && (
                        <>
                            {/* CRM Extras: Tags & Reminders */}
                            <div
                                className="addcard-form-grid"
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label
                                        style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}
                                    >
                                        {t('addCard.label.tags')}
                                    </label>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                            padding: '10px',
                                            background: 'var(--bg-input)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                        }}
                                    >
                                        {tagsLoading ? (
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                                                {t('addCard.label.tagsLoading')}
                                            </span>
                                        ) : (
                                            <>
                                                {availableTags &&
                                                    availableTags.length > 0 &&
                                                    availableTags.map((tag) => (
                                                        <button
                                                            key={tag.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const newTags = formData.tags.includes(tag.id)
                                                                    ? formData.tags.filter((id) => id !== tag.id)
                                                                    : [...formData.tags, tag.id];
                                                                setFormData((prev) => ({ ...prev, tags: newTags }));
                                                            }}
                                                            style={{
                                                                padding: '4px 12px',
                                                                borderRadius: '20px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                border: '1px solid',
                                                                borderColor: formData.tags.includes(tag.id)
                                                                    ? tag.color
                                                                    : 'var(--glass-border)',
                                                                background: formData.tags.includes(tag.id)
                                                                    ? tag.color
                                                                    : 'transparent',
                                                                color: formData.tags.includes(tag.id)
                                                                    ? 'white'
                                                                    : 'var(--text-secondary)',
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            {tag.name}
                                                        </button>
                                                    ))}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            showNewTagInput: !prev.showNewTagInput,
                                                        }))
                                                    }
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        border: '1px dashed var(--accent-primary)',
                                                        background: 'transparent',
                                                        color: 'var(--accent-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                    }}
                                                >
                                                    {formData.showNewTagInput ? '×' : t('addCard.btn.newTag')}
                                                </button>
                                                {formData.showNewTagInput && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            gap: '5px',
                                                            width: '100%',
                                                            marginTop: '5px',
                                                        }}
                                                    >
                                                        <input
                                                            type="text"
                                                            placeholder={t('addCard.placeholder.tagName')}
                                                            value={formData.newTagName}
                                                            onChange={(e) =>
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    newTagName: e.target.value,
                                                                }))
                                                            }
                                                            style={{
                                                                ...inputStyle,
                                                                flex: 1,
                                                                padding: '5px 10px',
                                                                height: '32px',
                                                                fontSize: '12px',
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!formData.newTagName.trim()) return;
                                                                try {
                                                                    const res = await api.post('/api/tags', {
                                                                        name: formData.newTagName,
                                                                        color:
                                                                            '#' +
                                                                            Math.floor(Math.random() * 16777215)
                                                                                .toString(16)
                                                                                .padStart(6, '0'),
                                                                    });
                                                                    setAvailableTags((prev) => [...prev, res.data]);
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        tags: [...prev.tags, res.data.id],
                                                                        newTagName: '',
                                                                        showNewTagInput: false,
                                                                    }));
                                                                    showNotification(
                                                                        t('addCard.notify.tagCreated'),
                                                                        'success',
                                                                    );
                                                                } catch (err) {
                                                                    showNotification(
                                                                        t('addCard.notify.tagCreateFailed'),
                                                                        'error',
                                                                    );
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '0 10px',
                                                                background: 'var(--accent-primary)',
                                                                color: 'var(--bg-card)',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                fontSize: '12px',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            {t('common:add')}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label
                                        style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}
                                    >
                                        {t('addCard.label.reminder')}
                                    </label>
                                    <input
                                        type="date"
                                        name="reminderDate"
                                        value={formData.reminderDate}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <select
                                name="visibility"
                                value={formData.visibility}
                                onChange={handleInputChange}
                                style={{ ...inputStyle, width: '100%', cursor: 'pointer', fontWeight: '500' }}
                            >
                                <option
                                    value="private"
                                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                >
                                    {t('addCard.visibility.private')}
                                </option>
                                <option
                                    value="public"
                                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                >
                                    {t('addCard.visibility.public')}
                                </option>
                            </select>
                        </>
                    )}

                    {/* Step 3: Relationship Management (Nurturing) */}
                    {currentStep === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div
                                className="addcard-form-grid"
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label
                                        style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}
                                    >
                                        {t('addCard.label.leadStatus')}
                                    </label>
                                    <select
                                        name="leadStatus"
                                        value={formData.leadStatus}
                                        onChange={handleInputChange}
                                        style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                                    >
                                        <option value="Cold">{t('common:leadStatus.Cold')}</option>
                                        <option value="Warm">{t('common:leadStatus.Warm')}</option>
                                        <option value="Hot">{t('common:leadStatus.Hot')}</option>
                                        <option value="Following-up">{t('common:leadStatus.Following-up')}</option>
                                        <option value="Converted">{t('common:leadStatus.Converted')}</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label
                                        style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}
                                    >
                                        {t('addCard.label.priority')}
                                    </label>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '10px',
                                            height: '45px',
                                            alignItems: 'center',
                                            background: 'var(--bg-card)',
                                            borderRadius: '10px',
                                            padding: '0 15px',
                                            border: '1px solid var(--glass-border)',
                                        }}
                                    >
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <FaStar
                                                key={star}
                                                size={20}
                                                color={
                                                    formData.priority >= star
                                                        ? 'var(--accent-warning)'
                                                        : 'var(--text-tertiary)'
                                                }
                                                style={{
                                                    cursor: 'pointer',
                                                    opacity: formData.priority >= star ? 1 : 0.3,
                                                }}
                                                onClick={() => setFormData((prev) => ({ ...prev, priority: star }))}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                    {t('addCard.label.source')}
                                </label>
                                <input
                                    type="text"
                                    name="source"
                                    placeholder={t('addCard.placeholder.source')}
                                    value={formData.source}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Wizard Navigation Buttons */}
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
                                style={{
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
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'var(--glass-bg-hover)';
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'var(--glass-bg)';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'var(--glass-shadow)';
                                }}
                            >
                                {t('common:save')}
                            </button>
                            <button
                                type="button"
                                onClick={handleNextStep}
                                disabled={ocr.ocrLoading}
                                style={{
                                    padding: '14px 24px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
                                }}
                            >
                                {t('common:next')}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                style={{
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
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'var(--glass-bg-hover)';
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = 'var(--glass-shadow-hover)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'var(--glass-bg)';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'var(--glass-shadow)';
                                }}
                            >
                                {t('common:back')}
                            </button>
                            {currentStep === 2 ? (
                                <button
                                    type="button"
                                    onClick={handleNextStep}
                                    style={{
                                        padding: '14px 24px',
                                        background:
                                            'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                                        color: 'var(--bg-card)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        boxShadow: 'var(--glass-shadow)',
                                    }}
                                >
                                    {t('common:next')}
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={ocr.ocrLoading}
                                    style={{
                                        padding: '14px 24px',
                                        background:
                                            'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                                        color: 'var(--bg-card)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        boxShadow: 'var(--glass-shadow)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-2px)';
                                        e.target.style.boxShadow = 'var(--glass-shadow-hover)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = 'var(--glass-shadow)';
                                    }}
                                >
                                    {activeCard ? t('common:update') : t('common:save')}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </form>

            {/* OCR Onay Modalı */}
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

            {/* Logo Kırpma Modalı */}
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
                                const canvas = warpPerspective(image, points, 400, 400); // Logo için 400x400
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
            {/* Mükerrer Kayıt Uyarısı */}
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
                    if (currentStep === 1) {
                        setCurrentStep(2);
                    }
                }}
                t={t}
            />
            {/* Kamera Yakalama Modalı */}
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
