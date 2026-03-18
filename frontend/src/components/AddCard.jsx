import React, { useState, useRef, useEffect } from 'react';
import { FaStar, FaIdCard, FaBuilding, FaUser, FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt, FaTags, FaClock, FaEye } from 'react-icons/fa';
import Tesseract from 'tesseract.js';
import PerspectiveCropper from './PerspectiveCropper';
import { warpPerspective } from '../utils/perspectiveHelper';
import api, { API_URL } from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { queueForSync } from '../utils/offlineStore';
import { useAuth } from '../context/AuthContext';

// Helper: Canvas kullanarak resmi kırpma
function canvasPreview(image, canvas, crop) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;

    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    ctx.translate(-cropX, -cropY);
    ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
    );
}

const AddCard = ({ onCardAdded, activeCard, isPersonal = false }) => {
    const { showNotification } = useNotification();
    const { user } = useAuth();

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

    const [logoBlob, setLogoBlob] = useState(null);
    const [logoTempSrc, setLogoTempSrc] = useState(null); // Logo kırpmak için kullanılan kaynak resim
    const [showLogoCrop, setShowLogoCrop] = useState(false);

    const imgRef = useRef(null);

    const [ocrLoading, setOcrLoading] = useState(false);

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
        leadStatus: 'Cold',
        priority: 1,
        source: ''
    });

    const [availableTags, setAvailableTags] = useState([]);
    const [tagsLoading, setTagsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1); // Wizard step: 1 or 2

    const [ocrResults, setOcrResults] = useState(null); // Geçici OCR sonuçları
    const [showOcrConfirm, setShowOcrConfirm] = useState(false); // Onay ekranı kontrolü

    const [duplicateCard, setDuplicateCard] = useState(null);
    const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
    const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

    // Kamera Modalı Durumu
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraSide, setCameraSide] = useState(null); // 'front' or 'back'
    const videoRef = useRef(null);
    const streamRef = useRef(null);

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
                tags: activeCard.tags ? activeCard.tags.map(t => t.id) : [],
                leadStatus: activeCard.leadStatus || 'Cold',
                priority: activeCard.priority || 1,
                source: activeCard.source || ''
            });
            // Var olan resimleri göster
            if (activeCard.frontImageUrl) setFrontPreview(`${API_URL}${activeCard.frontImageUrl}`);
            if (activeCard.backImageUrl) setBackPreview(`${API_URL}${activeCard.backImageUrl}`);
            if (activeCard.logoUrl) setLogoPreview(`${API_URL}${activeCard.logoUrl}`);
        } else {
            // Yeni kart ekleme modundaysak taslağı yükle
            const savedDraft = localStorage.getItem('bizcard_draft');
            if (savedDraft) {
                try {
                    const draftData = JSON.parse(savedDraft);
                    setFormData(prev => ({ ...prev, ...draftData }));
                } catch (e) {
                    console.error('Taslak yüklenirken hata:', e);
                }
            }
        }

        fetchTags();
    }, [activeCard]);

    // Taslağı Kaydet
    useEffect(() => {
        // Sadece yeni kart eklerken kaydet (düzenleme modunda taslağı bozmayalım)
        if (!activeCard) {
            localStorage.setItem('bizcard_draft', JSON.stringify(formData));
        }
    }, [formData, activeCard]);

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
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Wizard Step Navigation
    const validateStep1 = () => {
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            showNotification('Ad ve Soyad alanları zorunludur.', 'error');
            return false;
        }
        if (!formData.email.trim() && !formData.phone.trim()) {
            showNotification('E-posta veya Telefon alanlarından en az biri doldurulmalıdır.', 'error');
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
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleQuickSave = async (e) => {
        if (e) e.preventDefault();
        if (validateStep1()) {
            await handleSubmit(e, false, true); // forceAdd=false, isQuickSave=true
        }
    };


    // Kamera Başlatma
    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment', // Mümkünse arka kamera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
        } catch (err) {
            console.error('Kamera erişim hatası:', err);
            showNotification('Kamera başlatılamadı. Lütfen izin verin veya HTTPS kullandığınızdan emin olun.', 'error');
            // Fallback: Modalı kapat ve dosya diyaloğunu aç
            setShowCameraModal(false);
            const inputId = cameraSide === 'front' ? 'frontInput' : 'backInput';
            document.getElementById(inputId).click();
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCameraModal(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        
        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
            if (blob) {
                // Sıkıştırma sonrası handle
                const compressedBlob = await compressImage(blob);
                const file = new File([compressedBlob], `camera_${cameraSide}_${Date.now()}.jpg`, { type: 'image/jpeg' });
                
                // onSelectFile benzeri bir mantık ama File nesnesi ile
                const reader = new FileReader();
                reader.onload = () => {
                    setSrc(reader.result);
                    setActiveSide(cameraSide);
                };
                reader.readAsDataURL(file);
                
                if (cameraSide === 'front') {
                    setFrontBlob(compressedBlob);
                    setFrontPreview(URL.createObjectURL(compressedBlob));
                } else {
                    setBackBlob(compressedBlob);
                    setBackPreview(URL.createObjectURL(compressedBlob));
                }
                
                stopCamera();
            }
        }, 'image/jpeg', 0.9);
    };

    const openCamera = (side) => {
        setCameraSide(side);
        setShowCameraModal(true);
        // useEffect veya modal açıkken tetiklenecek
    };

    useEffect(() => {
        if (showCameraModal) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [showCameraModal]);
    // Dosya Seçimi Başlat
    const [aiDetectedPoints, setAiDetectedPoints] = useState(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [preFetchedAiData, setPreFetchedAiData] = useState(null);

    const detectAiBoundary = async (file) => {
        if (!user?.aiOcrEnabled) return;

        setIsDetecting(true);
        try {
            const formDataAi = new FormData();
            formDataAi.append('image', file, 'card.jpg');

            const response = await api.post('/api/cards/analyze-ai', formDataAi, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data && response.data.corners) {
                const c = response.data.corners;
                // Convert {topLeft: {x,y}, ...} to array [tl, tr, br, bl] for PerspectiveCropper
                const pointsArray = [
                    c.topLeft,
                    c.topRight,
                    c.bottomRight,
                    c.bottomLeft
                ];
                setAiDetectedPoints(pointsArray);
                // Sakla ki sonra tekrar AI çağırmayalım
                setPreFetchedAiData(response.data);
                showNotification('AI kart sınırlarını tespit etti.', 'success');
            }
        } catch (err) {
            console.error('AI Detection Error:', err);
            const errorMsg = err.response?.data?.error || 'AI servisi şu an kullanılamıyor.';
            showNotification(`${errorMsg} Kart sınırlarını lütfen manuel belirleyin.`, 'warning');
            // Hata olsa bile kullanıcı manuel devam edebilir
        } finally {
            setIsDetecting(false);
        }
    };

    const onSelectFile = async (e, side) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setSrc(url);
            setActiveSide(side);
            setAiDetectedPoints(null);
            setPreFetchedAiData(null);

            if (user?.aiOcrEnabled) {
                await detectAiBoundary(file);
            }
            e.target.value = null; // Clear the input so the same file can be selected again
        }
    };

    const handleCropComplete = async (naturalPoints, image) => {
        // Calculate aspect ratio of selected area
        const topWidth = Math.hypot(naturalPoints[1].x - naturalPoints[0].x, naturalPoints[1].y - naturalPoints[0].y);
        const bottomWidth = Math.hypot(naturalPoints[2].x - naturalPoints[3].x, naturalPoints[2].y - naturalPoints[3].y);
        const leftHeight = Math.hypot(naturalPoints[3].x - naturalPoints[0].x, naturalPoints[3].y - naturalPoints[0].y);
        const rightHeight = Math.hypot(naturalPoints[2].x - naturalPoints[1].x, naturalPoints[2].y - naturalPoints[1].y);

        const avgWidth = (topWidth + bottomWidth) / 2;
        const avgHeight = (leftHeight + rightHeight) / 2;
        const ratio = avgWidth / avgHeight;

        // Determine best fit standard dimensions
        let width = 1000;
        let height = Math.round(1000 / ratio);
        let cardType = "Özel Boyut";

        if (Math.abs(ratio - 1.58) < 0.05) {
            height = 633; // 85.6 x 53.98 (CR80)
            cardType = "Standart (EU/Kredi Kartı)";
        } else if (Math.abs(ratio - 1.75) < 0.05) {
            height = 571; // 3.5 x 2 (US)
            cardType = "Standart (US)";
        } else if (Math.abs(ratio - 1.0) < 0.1) {
            height = 1000;
            cardType = "Kare Kart";
        }

        const canvas = warpPerspective(image, naturalPoints, width, height);

        canvas.toBlob((blob) => {
            if (!blob) return;

            const previewUrl = URL.createObjectURL(blob);

            if (activeSide === 'front') {
                setFrontBlob(blob);
                setFrontPreview(previewUrl);
                setLogoTempSrc(previewUrl);
                performOCR(blob);
                showNotification(`Kart Algılandı: ${cardType}`, 'info');
            } else {
                setBackBlob(blob);
                setBackPreview(previewUrl);
            }

            setSrc(null);
            setActiveSide(null);

        }, 'image/jpeg', 0.7); // Client-side sıkıştırma eklendi (0.7 kalite)
    };

    const performOCR = async (fileBlob) => {
        setOcrLoading(true);
        try {
            // Eğer AI OCR aktifse
            if (user?.aiOcrEnabled) {
                try {
                    // Eğer veriler önceden başarıyla çekildiyse onları kullan
                    if (preFetchedAiData) {
                        setOcrResults(preFetchedAiData);
                        setShowOcrConfirm(true);
                        showNotification('AI tarama sonuçları kullanıldı.', 'success');
                        setOcrLoading(false);
                        return;
                    }

                    // Yoksa backend'e tekrar gönder (fallback)
                    const formDataAi = new FormData();
                    formDataAi.append('image', fileBlob, 'card.jpg');

                    const response = await api.post('/api/cards/analyze-ai', formDataAi, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    setOcrResults(response.data);
                    setShowOcrConfirm(true);
                    showNotification('AI ile tarama tamamlandı.', 'success');
                    setOcrLoading(false);
                    return;
                } catch (aiErr) {
                    console.error('AI OCR Hatası, Tesseract\'a dönülüyor:', aiErr);
                    const msg = aiErr.response?.data?.error || 'AI servisi yanıt vermedi.';
                    showNotification(`${msg} Yerel OCR (Tesseract) ile devam ediliyor...`, 'warning');
                    // Başarısız olursa alt satıra (Tesseract) devam et
                }
            }

            const blobUrl = URL.createObjectURL(fileBlob);
            const result = await Tesseract.recognize(blobUrl, 'tur');
            const text = result.data.text;

            // REGEX ve Kelime Bazlı Ayıklama
            let emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);

            // Eğer @ bulunamadıysa, OCR hatası ihtimaline karşı (O veya 0) kontrol et
            if (!emailMatch) {
                const brokenEmailMatch = text.match(/([a-zA-Z0-9._-]+[O0][a-zA-Z0-9._-]+\.(com|net|org|edu|gov|tr|info|biz))/gi);
                if (brokenEmailMatch) {
                    // O veya 0'ı @ ile değiştir
                    emailMatch = brokenEmailMatch.map(e => e.replace(/[O0](?=[^.O0]+\.)/, '@'));
                }
            }

            const phoneMatch = text.match(/((\+90|0)?\s*\(?\d{3}\)?\s*\d{3}\s*\d{2}\s*\d{2})/);

            // Website regexini daha spesifik yap ve emailleri hariç tut
            let websiteMatches = text.match(/(https?:\/\/|www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi);
            let finalWebsite = '';

            if (websiteMatches) {
                // Email olanları veya email gibi duranları filtrele
                const filteredWebsites = websiteMatches.filter(w => {
                    const isEmail = w.includes('@') || (emailMatch && emailMatch.some(e => e.includes(w)));
                    // Eğer başında www veya http varsa büyük ihtimalle websitedir
                    const hasWebPrefix = w.toLowerCase().startsWith('www') || w.toLowerCase().startsWith('http');
                    return !isEmail || hasWebPrefix;
                });
                if (filteredWebsites.length > 0) {
                    finalWebsite = filteredWebsites[0];
                }
            }

            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);

            let extractedAddress = '';
            let extractedCompany = '';
            let extractedTitle = '';
            let extractedFirstName = '';
            let extractedLastName = '';

            const addressKeywords = ['mah', 'cad', 'sok', 'no:', 'kat:', 'daire:', 'bulvar', 'plaza', 'blok', 'yol', 'meydan'];
            const companyKeywords = ['ltd', 'şti', 'a.ş', 'anonim', 'holding', 'sanayi', 'ticaret', 'as', 'inc', 'corp'];
            const titleKeywords = ['müdür', 'manager', 'director', 'başkan', 'ceo', 'cto', 'engineer', 'mühendis', 'uzman', 'analist', 'koordinatör'];

            lines.forEach((line, index) => {
                const lower = line.toLowerCase();

                // Adres Kontrolü
                if (addressKeywords.some(kw => lower.includes(kw))) {
                    extractedAddress += (extractedAddress ? ' ' : '') + line;
                }
                // Şirket Kontrolü
                else if (companyKeywords.some(kw => lower.includes(kw))) {
                    extractedCompany = line;
                }
                // Ünvan Kontrolü
                else if (titleKeywords.some(kw => lower.includes(kw))) {
                    extractedTitle = line;
                }
                // Muhtemel İsim Satırı (Genellikle ilk satırlardan biridir ve çok kısadır)
                else if (index < 3 && !extractedFirstName && line.split(' ').length <= 3) {
                    const parts = line.split(' ');
                    if (parts.length >= 2) {
                        extractedFirstName = parts.slice(0, -1).join(' ');
                        extractedLastName = parts[parts.length - 1];
                    }
                }
            });

            setOcrResults({
                email: emailMatch ? emailMatch[0] : '',
                phone: phoneMatch ? phoneMatch[0] : '',
                website: finalWebsite,
                company: extractedCompany,
                title: extractedTitle,
                address: extractedAddress,
                ocrText: text,
                firstName: extractedFirstName,
                lastName: extractedLastName
            });
            setShowOcrConfirm(true);

        } catch (err) {
            console.error('OCR Hatası:', err);
            const errorMsg = err.response?.data?.error || 'OCR işlemi sırasında bir hata oluştu.';
            showNotification(errorMsg, 'error');
        } finally {
            setOcrLoading(false);
        }
    };

    const handleSubmit = async (e, forceAdd = false, isQuickSave = false) => {
        if (e) e.preventDefault();

        // Eğer Step 1'deysek ve Quick Save değilse, sadece Next Step'e yönlendir
        if (currentStep === 1 && !isQuickSave) {
            handleNextStep(e);
            return;
        }

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            showNotification('Lütfen Ad ve Soyad alanlarını doldurunuz.', 'error');
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
                        phone: formData.phone
                    }
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
        Object.keys(formData).forEach(key => {
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
                    reminderDate: formData.reminderDate
                };
                await queueForSync('CREATE_CARD', offlineData);
                showNotification('İnternet yok: Kart senkronizasyon için sıraya alındı.', 'info');
                if (onCardAdded) onCardAdded();
                return;
            }

            if (activeCard) {
                // GÜNCELLEME (PUT)
                await api.put(`/api/cards/${activeCard.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Kartvizit başarıyla güncellendi!', 'success');
            } else {
                // YENİ EKLEME (POST)
                await api.post('/api/cards', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Kartvizit başarıyla eklendi!', 'success');
            }

            // Başarılı işlem sonrası taslağı temizle
            localStorage.removeItem('bizcard_draft');

            if (onCardAdded) onCardAdded();

            // Form Reset (Eğer modal kapanmıyorsa manuel sıfırlama gerekebilir ama modal kapanacağı için sorun yok)
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            showNotification('Hata oluştu: ' + (error.response?.data?.error || error.message), 'error');
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
        transition: 'all 0.2s ease'
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0', color: 'var(--text-primary)' }}>
            {src && (
                <div style={{
                    marginBottom: '25px',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(5px)',
                    border: '1px solid var(--glass-border)',
                    padding: '20px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <h4 style={{ margin: '0 0 15px 0', fontWeight: '600', fontSize: '1.1rem' }}>Perspektif Düzeltme ({activeSide === 'front' ? 'Ön Yüz' : 'Arka Yüz'})</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>Lütfen kartvizitin 4 köşesini işaretleyin.</p>

                    {isDetecting && (
                        <div style={{
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
                            borderRadius: '16px'
                        }}>
                            <div className="spinner" style={{ marginBottom: '10px' }}></div>
                            <p style={{ color: 'white', fontWeight: 'bold' }}>AI Kart Sınırlarını Tespit Ediyor...</p>
                        </div>
                    )}

                    <PerspectiveCropper
                        key={src}
                        src={src}
                        onCropComplete={handleCropComplete}
                        initialPoints={aiDetectedPoints}
                    />
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '25px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Ön Yüz */}
                    <div style={{
                        border: '1px dashed var(--glass-border)',
                        padding: '15px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        background: 'var(--glass-bg)',
                        minHeight: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}>
                        <h4 style={{ marginTop: 0, marginBottom: '12px', fontWeight: '600' }}>Ön Yüz</h4>
                        {frontPreview ? (
                            <div style={{ position: 'relative' }}>
                                <img src={frontPreview} alt="Ön Yüz" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px' }} />
                                <div style={{ display: 'flex', gap: '5px', position: 'absolute', bottom: '8px', right: '8px' }}>
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
                                            fontWeight: '500'
                                        }}>{logoPreview ? 'Logoyu Değiştir' : 'Logo Seç'}</button>
                                    <button
                                        type="button"
                                        onClick={(e) => document.getElementById('frontInput').click()}
                                        style={{
                                            fontSize: '13px',
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            background: 'var(--bg-card)',
                                            backdropFilter: 'blur(5px)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            fontWeight: '500'
                                        }}>Seç</button>
                                    <button
                                        type="button"
                                        onClick={(e) => openCamera('front')}
                                        style={{
                                            fontSize: '13px',
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            background: 'var(--accent-primary)',
                                            color: 'var(--bg-card)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600'
                                        }}>Kamera</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div onClick={() => document.getElementById('frontInput').click()} style={{
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
                                    fontSize: '14px'
                                }}>
                                    <span>Dosya Seç</span>
                                </div>
                                <div onClick={() => openCamera('front')} style={{
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
                                    fontWeight: 'bold'
                                }}>
                                    <span>📷 Kameradan Çek</span>
                                </div>
                            </div>
                        )}
                        <input id="frontInput" type="file" accept="image/*" onChange={(e) => onSelectFile(e, 'front')} style={{ display: 'none' }} />
                        <input id="frontCamera" type="file" accept="image/*" capture="environment" onChange={(e) => onSelectFile(e, 'front')} style={{ display: 'none' }} />
                        {ocrLoading && <p style={{ color: 'var(--accent-warning)', fontSize: '13px', marginTop: '8px', fontWeight: '500' }}>OCR Okunuyor...</p>}
                    </div>

                    {/* Arka Yüz */}
                    <div style={{
                        border: '1px dashed var(--glass-border)',
                        padding: '15px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        background: 'var(--glass-bg)',
                        minHeight: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <h4 style={{ marginTop: 0, marginBottom: '12px', fontWeight: '600' }}>Arka Yüz</h4>
                        {backPreview ? (
                            <div style={{ position: 'relative' }}>
                                <img src={backPreview} alt="Arka Yüz" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px' }} />
                                <div style={{ display: 'flex', gap: '5px', position: 'absolute', bottom: '8px', right: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => document.getElementById('backInput').click()}
                                        style={{
                                            fontSize: '13px',
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            background: 'var(--bg-card)',
                                            backdropFilter: 'blur(5px)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            fontWeight: '500'
                                        }}>Seç</button>
                                     <button
                                        type="button"
                                        onClick={(e) => openCamera('back')}
                                        style={{
                                            fontSize: '13px',
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            background: 'var(--accent-primary)',
                                            color: 'var(--bg-card)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600'
                                        }}>Kamera</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div onClick={() => document.getElementById('backInput').click()} style={{
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
                                    fontSize: '14px'
                                }}>
                                    <span>Dosya Seç</span>
                                </div>
                                <div onClick={() => openCamera('back')} style={{
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
                                    fontWeight: 'bold'
                                }}>
                                    <span>📷 Kameradan Çek</span>
                                </div>
                            </div>
                        )}
                        <input id="backInput" type="file" accept="image/*" onChange={(e) => onSelectFile(e, 'back')} style={{ display: 'none' }} />
                        <input id="backCamera" type="file" accept="image/*" capture="environment" onChange={(e) => onSelectFile(e, 'back')} style={{ display: 'none' }} />
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--glass-border)' }}></div>

                {/* Progress Indicator */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    padding: '20px 0',
                    marginBottom: '10px'
                }}>
                    {/* Step 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: currentStep >= 1 ? 'var(--accent-primary)' : 'var(--glass-bg)',
                            border: currentStep >= 1 ? '2px solid var(--accent-primary)' : '2px solid var(--glass-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: currentStep >= 1 ? 'var(--bg-card)' : 'var(--text-secondary)',
                            fontWeight: '700', fontSize: '14px'
                        }}>1</div>
                        <span style={{ color: currentStep >= 1 ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '14px' }}>Temel</span>
                    </div>

                    <div style={{ width: '40px', height: '2px', background: currentStep >= 2 ? 'var(--accent-primary)' : 'var(--glass-border)' }}></div>

                    {/* Step 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: currentStep >= 2 ? 'var(--accent-primary)' : 'var(--glass-bg)',
                            border: currentStep >= 2 ? '2px solid var(--accent-primary)' : '2px solid var(--glass-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: currentStep >= 2 ? 'var(--bg-card)' : 'var(--text-secondary)',
                            fontWeight: '700', fontSize: '14px'
                        }}>2</div>
                        <span style={{ color: currentStep >= 2 ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '14px' }}>Detay</span>
                    </div>

                    <div style={{ width: '40px', height: '2px', background: currentStep >= 3 ? 'var(--accent-primary)' : 'var(--glass-border)' }}></div>

                    {/* Step 3 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: currentStep >= 3 ? 'var(--accent-primary)' : 'var(--glass-bg)',
                            border: currentStep >= 3 ? '2px solid var(--accent-primary)' : '2px solid var(--glass-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: currentStep >= 3 ? 'var(--bg-card)' : 'var(--text-secondary)',
                            fontWeight: '700', fontSize: '14px'
                        }}>3</div>
                        <span style={{ color: currentStep >= 3 ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '14px' }}>Lead</span>
                    </div>
                </div>


                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Step 1: Basic Information */}
                    {currentStep === 1 && (
                        <>
                            {/* Native Contact Picker Integration */}
                            {('contacts' in navigator && 'ContactsManager' in window) && (
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
                                                setFormData(prev => ({
                                                    ...prev,
                                                    firstName: names.slice(0, -1).join(' ') || contact.name[0] || '',
                                                    lastName: names[names.length - 1] || '',
                                                    email: contact.email[0] || '',
                                                    phone: contact.tel[0] || ''
                                                }));
                                                showNotification('Rehberden bilgiler aktarıldı.', 'success');
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
                                        gap: '8px'
                                    }}
                                >
                                    Rehberden İçe Aktar (Hızlı Doldur)
                                </button>
                            )}

                            {/* Temel Bilgiler */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <input type="text" name="firstName" placeholder="Ad *" value={formData.firstName} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.borderColor = 'var(--accent-primary)'; }} onBlur={(e) => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--glass-border)'; }} required />
                                <input type="text" name="lastName" placeholder="Soyad *" value={formData.lastName} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.borderColor = 'var(--accent-primary)'; }} onBlur={(e) => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--glass-border)'; }} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <input type="text" name="company" placeholder="Şirket" value={formData.company} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.borderColor = 'var(--accent-primary)'; }} onBlur={(e) => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--glass-border)'; }} />
                                <input type="text" name="title" placeholder="Ünvan" value={formData.title} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.borderColor = 'var(--accent-primary)'; }} onBlur={(e) => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--glass-border)'; }} />
                            </div>

                            {/* İletişim Bilgileri */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <input type="email" name="email" placeholder="E-Posta *" value={formData.email} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.borderColor = 'var(--accent-primary)'; }} onBlur={(e) => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--glass-border)'; }} />
                                <input type="text" name="phone" placeholder="Telefon *" value={formData.phone} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.borderColor = 'var(--accent-primary)'; }} onBlur={(e) => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--glass-border)'; }} />
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '-10px 0 0 0', fontStyle: 'italic' }}>
                                * E-posta veya Telefon alanlarından en az biri doldurulmalıdır
                            </p>
                        </>
                    )}

                    {/* Step 2: Detailed Information */}
                    {currentStep === 2 && (
                        <>
                            {/* Web Sitesi */}
                            <input type="text" name="website" placeholder="Web Sitesi" value={formData.website} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }} />

                            {/* Adres Bilgileri Grubu */}
                            <fieldset style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '15px', margin: 0, background: 'var(--glass-bg)' }}>
                                <legend style={{ padding: '0 8px', color: 'var(--text-secondary)', fontSize: '0.95em', fontWeight: '500' }}>Adres Bilgileri</legend>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <textarea name="address" rows="2" placeholder="Açık Adres" value={formData.address} onChange={handleInputChange} style={{ ...inputStyle, width: '100%', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} onFocus={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.borderColor = 'var(--accent-primary)'; }} onBlur={(e) => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--glass-border)'; }}></textarea>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <input type="text" name="city" placeholder="Şehir" value={formData.city} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.borderColor = 'var(--accent-primary)'; }} onBlur={(e) => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--glass-border)'; }} />
                                        <input type="text" name="country" placeholder="Ülke" value={formData.country} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.borderColor = 'var(--accent-primary)'; }} onBlur={(e) => { e.target.style.background = 'var(--bg-card)'; e.target.style.borderColor = 'var(--glass-border)'; }} />
                                    </div>
                                </div>
                            </fieldset>

                            {/* CRM Extras: Tags & Reminders */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Etiketler</label>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                        padding: '10px',
                                        background: 'var(--bg-input)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)'
                                    }}>
                                        {tagsLoading ? (
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Etiketler yükleniyor...</span>
                                        ) : availableTags && availableTags.length > 0 ? availableTags.map(tag => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => {
                                                    const newTags = formData.tags.includes(tag.id)
                                                        ? formData.tags.filter(id => id !== tag.id)
                                                        : [...formData.tags, tag.id];
                                                    setFormData(prev => ({ ...prev, tags: newTags }));
                                                }}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    border: '1px solid',
                                                    borderColor: formData.tags.includes(tag.id) ? tag.color : 'var(--glass-border)',
                                                    background: formData.tags.includes(tag.id) ? tag.color : 'transparent',
                                                    color: formData.tags.includes(tag.id) ? 'white' : 'var(--text-secondary)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        )) : (
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Henüz etiket tanımlanmamış. Ayarlardan oluşturabilirsiniz.</span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Takip Hatırlatıcısı</label>
                                    <input
                                        type="date"
                                        name="reminderDate"
                                        value={formData.reminderDate}
                                        onChange={handleInputChange}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <select name="visibility" value={formData.visibility} onChange={handleInputChange} style={{ ...inputStyle, width: '100%', cursor: 'pointer', fontWeight: '500' }}>
                                <option value="private" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Sadece Ben (Private)</option>
                                <option value="public" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Herkes (Public)</option>
                            </select>
                        </>
                    )}

                    {/* Step 3: Relationship Management (Nurturing) */}
                    {currentStep === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>İlişki Durumu (Lead Status)</label>
                                    <select 
                                        name="leadStatus" 
                                        value={formData.leadStatus} 
                                        onChange={handleInputChange} 
                                        style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                                    >
                                        <option value="Cold">❄️ Soğuk (Cold)</option>
                                        <option value="Warm">⛅ Ilık (Warm)</option>
                                        <option value="Hot">🔥 Sıcak (Hot)</option>
                                        <option value="Following-up">🔄 Takipte (Following-up)</option>
                                        <option value="Converted">✅ Dönüştü (Converted)</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Önem Derecesi (Priority)</label>
                                    <div style={{ display: 'flex', gap: '10px', height: '45px', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '10px', padding: '0 15px', border: '1px solid var(--glass-border)' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <FaStar 
                                                key={star}
                                                size={20}
                                                color={formData.priority >= star ? 'var(--accent-warning)' : 'var(--text-tertiary)'}
                                                style={{ cursor: 'pointer', opacity: formData.priority >= star ? 1 : 0.3 }}
                                                onClick={() => setFormData(prev => ({ ...prev, priority: star }))}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tanışma Kaynağı (Source)</label>
                                <input 
                                    type="text" 
                                    name="source" 
                                    placeholder="Örn: Expo 2026, LinkedIn, Referans..." 
                                    value={formData.source} 
                                    onChange={handleInputChange} 
                                    style={inputStyle} 
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Notlar</label>
                                <textarea 
                                    name="notes" 
                                    rows="4" 
                                    placeholder="Kişi hakkında özel notlar, hobiler, ilgi alanları..." 
                                    value={formData.notes} 
                                    onChange={handleInputChange} 
                                    style={{ ...inputStyle, width: '100%', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    )}
                </div>


                {/* Wizard Navigation Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    {currentStep === 1 ? (
                        <>
                            <button
                                type="button"
                                onClick={handleQuickSave}
                                disabled={ocrLoading}
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
                                    boxShadow: 'var(--glass-shadow)'
                                }}
                                onMouseEnter={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'; }}
                                onMouseLeave={(e) => { e.target.style.background = 'var(--glass-bg)'; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'var(--glass-shadow)'; }}
                            >
                                Kaydet
                            </button>
                             <button
                                 type="button"
                                 onClick={handleNextStep}
                                 disabled={ocrLoading}
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
                                     gap: '8px'
                                 }}
                                 onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'; }}
                                 onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)'; }}
                             >
                                 İleri →
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
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => { e.target.style.background = 'var(--glass-bg-hover)'; e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = 'var(--glass-shadow-hover)'; }}
                                onMouseLeave={(e) => { e.target.style.background = 'var(--glass-bg)'; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'var(--glass-shadow)'; }}
                            >
                                ← Geri
                            </button>
                            {currentStep === 2 ? (
                                <button
                                    type="button"
                                    onClick={handleNextStep}
                                    style={{
                                        padding: '14px 24px',
                                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                                        color: 'var(--bg-card)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        boxShadow: 'var(--glass-shadow)'
                                    }}
                                >
                                    İleri →
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={ocrLoading}
                                    style={{
                                        padding: '14px 24px',
                                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                                        color: 'var(--bg-card)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        boxShadow: 'var(--glass-shadow)'
                                    }}
                                    onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = 'var(--glass-shadow-hover)'; }}
                                    onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'var(--glass-shadow)'; }}
                                >
                                    {activeCard ? 'Güncelle' : 'Kaydet'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </form >

            {/* OCR Onay Modalı / Overlay */}
            {
                showOcrConfirm && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '24px',
                            width: '100%',
                            maxWidth: '600px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '30px',
                            boxShadow: 'var(--glass-shadow-hover)'
                        }}>
                            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🔍</span> Tarama Sonuçlarını Onayla
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '25px' }}>
                                Kartvizitten okunan bilgiler aşağıdadır. Lütfen doğruluğunu kontrol edin ve gerekiyorsa düzeltin.
                            </p>

                            <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ color: 'var(--accent-warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>AD</label>
                                        <input
                                            type="text"
                                            value={ocrResults.firstName}
                                            onChange={(e) => setOcrResults({ ...ocrResults, firstName: e.target.value })}
                                            style={inputStyle}
                                            placeholder="Ad..."
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ color: 'var(--accent-warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>SOYAD</label>
                                        <input
                                            type="text"
                                            value={ocrResults.lastName}
                                            onChange={(e) => setOcrResults({ ...ocrResults, lastName: e.target.value })}
                                            style={inputStyle}
                                            placeholder="Soyad..."
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ color: 'var(--accent-warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>ŞİRKET</label>
                                        <input
                                            type="text"
                                            value={ocrResults.company}
                                            onChange={(e) => setOcrResults({ ...ocrResults, company: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ color: 'var(--accent-warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>ÜNVAN</label>
                                        <input
                                            type="text"
                                            value={ocrResults.title}
                                            onChange={(e) => setOcrResults({ ...ocrResults, title: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ color: 'var(--accent-warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>E-POSTA</label>
                                        <input
                                            type="text"
                                            value={ocrResults.email}
                                            onChange={(e) => setOcrResults({ ...ocrResults, email: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ color: 'var(--accent-warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>TELEFON</label>
                                        <input
                                            type="text"
                                            value={ocrResults.phone}
                                            onChange={(e) => setOcrResults({ ...ocrResults, phone: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: 'var(--accent-warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>WEB SİTESİ</label>
                                    <input
                                        type="text"
                                        value={ocrResults.website}
                                        onChange={(e) => setOcrResults({ ...ocrResults, website: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: 'var(--accent-warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>ADRES</label>
                                    <textarea
                                        value={ocrResults.address}
                                        onChange={(e) => setOcrResults({ ...ocrResults, address: e.target.value })}
                                        style={{ ...inputStyle, minHeight: '80px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowOcrConfirm(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'var(--glass-bg)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            ...ocrResults
                                        }));
                                        setShowOcrConfirm(false);
                                        showNotification('Bilgiler forma aktarıldı.', 'success');
                                    }}
                                    style={{
                                        flex: 2,
                                        padding: '12px',
                                        background: 'linear-gradient(135deg, var(--accent-success) 0%, #22c55e 100%)',
                                        color: 'var(--bg-card)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        boxShadow: 'var(--glass-shadow)'
                                    }}
                                >
                                    Onayla ve Aktar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Logo Kırpma Modalı */}
            {
                showLogoCrop && (
                    <div style={{
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
                        padding: '20px'
                    }}>
                        <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '24px', border: '1px solid var(--glass-border)', maxWidth: '90%', maxHeight: '90%', overflow: 'auto', boxShadow: 'var(--glass-shadow-hover)' }}>
                            <h4 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Şirket Logosunu Seçin</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>Lütfen logoyu içeren alanı 4 köşe ile işaretleyin.</p>
                            <PerspectiveCropper
                                src={logoTempSrc}
                                onCropComplete={async (points, image) => {
                                    const canvas = warpPerspective(image, points, 400, 400); // Logo için 400x400
                                    canvas.toBlob((blob) => {
                                        setLogoBlob(blob);
                                        setLogoPreview(URL.createObjectURL(blob));
                                        setShowLogoCrop(false);
                                    }, 'image/png');
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowLogoCrop(false)}
                                style={{ marginTop: '15px', padding: '10px 20px', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '12px', cursor: 'pointer' }}
                            >Vazgeç</button>
                        </div>
                    </div>
                )
            }
            {/* Mükerrer Kayıt Uyarısı */}
            {
                showDuplicateAlert && duplicateCard && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(15px)',
                        zIndex: 4000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '24px',
                            width: '100%',
                            maxWidth: '500px',
                            padding: '30px',
                            boxShadow: 'var(--glass-shadow-hover)',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '70px',
                                height: '70px',
                                background: 'rgba(255, 193, 7, 0.15)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                                fontSize: '2rem'
                            }}>
                                ⚠️
                            </div>
                            <h3 style={{ color: 'var(--accent-warning)', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Benzer Kayıt Tespit Edildi!</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '25px' }}>
                                <b>{duplicateCard.firstName} {duplicateCard.lastName}</b> adına zaten bir kayıt mevcut.
                            </p>

                            <div style={{
                                background: 'var(--glass-bg)',
                                borderRadius: '16px',
                                padding: '20px',
                                marginBottom: '30px',
                                textAlign: 'left',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-tertiary)' }}>Şirket:</span>
                                    <span>{duplicateCard.company || '-'}</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>E-Posta:</span>
                                    <span>{duplicateCard.email || '-'}</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>Ekleyen:</span>
                                    <span style={{ color: 'var(--accent-success)' }}>@{duplicateCard.owner?.displayName || 'Sistem'}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={() => {
                                        // Mevcut kartı düzenleme moduna al
                                        if (onCardAdded) onCardAdded(duplicateCard);
                                        setShowDuplicateAlert(false);
                                        showNotification('Düzenleme moduna geçildi.', 'info');
                                    }}
                                    style={{
                                        padding: '14px',
                                        background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)',
                                        color: 'var(--bg-card)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        boxShadow: 'var(--glass-shadow)'
                                    }}
                                >
                                    Mevcut Kaydı Güncelle
                                </button>
                                <button
                                    onClick={() => {
                                        setIgnoreDuplicate(true);
                                        setShowDuplicateAlert(false);
                                        // If on Step 1, proceed to Step 2
                                        if (currentStep === 1) {
                                            setCurrentStep(2);
                                        }
                                        // If on Step 2 or during Quick Save, the form will submit normally
                                    }}
                                    style={{
                                        padding: '12px',
                                        background: 'var(--glass-bg)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    Yine de Yeni Oluştur
                                </button>
                                <button
                                    onClick={() => setShowDuplicateAlert(false)}
                                    style={{
                                        background: 'transparent',
                                        color: 'var(--text-tertiary)',
                                        border: 'none',
                                        padding: '5px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        marginTop: '5px',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    İptal Et
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Kamera Yakalama Modalı */}
            {showCameraModal && (
                <div style={{
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
                    padding: '20px'
                }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '640px', aspectRatio: '4/3', background: 'black', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--accent-primary)' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        
                        {/* Vizör Çerçevesi */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '85%',
                            height: '60%',
                            border: '2px dashed var(--accent-primary)',
                            borderRadius: '12px',
                            pointerEvents: 'none',
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                        }}>
                             <div style={{ position: 'absolute', top: '-30px', left: 0, right: 0, textAlign: 'center', color: 'var(--accent-primary)', fontSize: '14px', fontWeight: 'bold' }}>
                                Kartı buraya hizalayın
                             </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                        <button
                            type="button"
                            onClick={stopCamera}
                            style={{
                                padding: '12px 24px',
                                background: 'white',
                                color: 'black',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >İptal</button>
                        <button
                            type="button"
                            onClick={capturePhoto}
                            style={{
                                padding: '12px 40px',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >📸 Fotoğraf Çek</button>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AddCard;
