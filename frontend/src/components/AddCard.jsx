import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import PerspectiveCropper from './PerspectiveCropper';
import { warpPerspective } from '../utils/perspectiveHelper';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { queueForSync } from '../utils/offlineStore';
import { useAuth } from '../context/AuthContext';

// Helper: Canvas kullanarak resmi kırpma
function canvasPreview(image, canvas, crop) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('No 2d context');
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
        tags: []
    });

    const [availableTags, setAvailableTags] = useState([]);
    const [currentStep, setCurrentStep] = useState(1); // Wizard step: 1 or 2

    const [ocrResults, setOcrResults] = useState(null); // Geçici OCR sonuçları
    const [showOcrConfirm, setShowOcrConfirm] = useState(false); // Onay ekranı kontrolü

    const [duplicateCard, setDuplicateCard] = useState(null);
    const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
    const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

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
                notes: activeCard.notes || '',
                visibility: activeCard.visibility || 'private',
                reminderDate: activeCard.reminderDate ? new Date(activeCard.reminderDate).toISOString().split('T')[0] : '',
                tags: activeCard.tags ? activeCard.tags.map(t => t.id) : []
            });
            // Var olan resimleri göster
            if (activeCard.frontImageUrl) setFrontPreview(`http://localhost:5000${activeCard.frontImageUrl}`);
            if (activeCard.backImageUrl) setBackPreview(`http://localhost:5000${activeCard.backImageUrl}`);
            if (activeCard.logoUrl) setLogoPreview(`http://localhost:5000${activeCard.logoUrl}`);
        }

        fetchTags();
    }, [activeCard]);

    const fetchTags = async () => {
        try {
            const res = await api.get('/api/tags');
            setAvailableTags(res.data);
        } catch (err) {
            console.error('Error fetching tags:', err);
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
        if (validateStep1()) {
            setCurrentStep(2);
        }
    };

    const handlePrevStep = (e) => {
        if (e) e.preventDefault();
        setCurrentStep(1);
    };

    const handleQuickSave = async (e) => {
        if (e) e.preventDefault();
        if (validateStep1()) {
            await handleSubmit(e, false, true); // forceAdd=false, isQuickSave=true
        }
    };


    // ... (OCR ve Resim Yükleme kodları aynı kalabilir, sadece input onChange eklenmeli)
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

        }, 'image/jpeg');
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
                    params: { firstName: formData.firstName, lastName: formData.lastName }
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
        border: '1px solid rgba(255, 255, 255, 0.3)',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(5px)',
        color: 'white',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s ease'
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0', color: 'white' }}>
            {src && (
                <div style={{
                    marginBottom: '25px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(5px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '20px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <h4 style={{ margin: '0 0 15px 0', fontWeight: '600', fontSize: '1.1rem' }}>Perspektif Düzeltme ({activeSide === 'front' ? 'Ön Yüz' : 'Arka Yüz'})</h4>
                    <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '15px' }}>Lütfen kartvizitin 4 köşesini işaretleyin.</p>

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
                        border: '1px dashed rgba(255, 255, 255, 0.3)',
                        padding: '15px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
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
                                            background: 'rgba(40, 167, 69, 0.9)',
                                            backdropFilter: 'blur(5px)',
                                            color: 'white',
                                            border: '1px solid rgba(255,255,255,0.3)',
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
                                            background: 'rgba(0,0,0,0.8)',
                                            backdropFilter: 'blur(5px)',
                                            color: 'white',
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            borderRadius: '8px',
                                            fontWeight: '500'
                                        }}>Değiştir</button>
                                </div>
                                {logoPreview && (
                                    <div style={{ position: 'absolute', top: '8px', left: '8px', border: '2px solid #28a745', borderRadius: '4px', overflow: 'hidden' }}>
                                        <img src={logoPreview} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'white' }} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div onClick={() => document.getElementById('frontInput').click()} style={{
                                cursor: 'pointer',
                                height: '110px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.2s ease'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            >
                                <span style={{ fontSize: '52px', color: 'rgba(255,255,255,0.4)' }}>+</span>
                            </div>
                        )}
                        <input id="frontInput" type="file" accept="image/*" onChange={(e) => onSelectFile(e, 'front')} style={{ display: 'none' }} />
                        {ocrLoading && <p style={{ color: '#ffd700', fontSize: '13px', marginTop: '8px', fontWeight: '500' }}>OCR Okunuyor...</p>}
                    </div>

                    {/* Arka Yüz */}
                    <div style={{
                        border: '1px dashed rgba(255, 255, 255, 0.3)',
                        padding: '15px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        minHeight: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <h4 style={{ marginTop: 0, marginBottom: '12px', fontWeight: '600' }}>Arka Yüz</h4>
                        {backPreview ? (
                            <div style={{ position: 'relative' }}>
                                <img src={backPreview} alt="Arka Yüz" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px' }} />
                                <button
                                    type="button"
                                    onClick={(e) => document.getElementById('backInput').click()}
                                    style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '8px',
                                        fontSize: '13px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        background: 'rgba(0,0,0,0.8)',
                                        backdropFilter: 'blur(5px)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '8px',
                                        fontWeight: '500'
                                    }}>Değiştir</button>
                            </div>
                        ) : (
                            <div onClick={() => document.getElementById('backInput').click()} style={{
                                cursor: 'pointer',
                                height: '110px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.2s ease'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            >
                                <span style={{ fontSize: '52px', color: 'rgba(255,255,255,0.4)' }}>+</span>
                            </div>
                        )}
                        <input id="backInput" type="file" accept="image/*" onChange={(e) => onSelectFile(e, 'back')} style={{ display: 'none' }} />
                    </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)' }}></div>

                {/* Progress Indicator */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px 0',
                    marginBottom: '10px'
                }}>
                    {/* Step 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: currentStep >= 1 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
                            border: currentStep >= 1 ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '14px',
                            transition: 'all 0.3s ease'
                        }}>
                            1
                        </div>
                        <span style={{
                            color: currentStep >= 1 ? 'white' : 'rgba(255,255,255,0.5)',
                            fontWeight: currentStep === 1 ? '600' : '400',
                            fontSize: '14px',
                            transition: 'all 0.3s ease'
                        }}>
                            Temel Bilgiler
                        </span>
                    </div>

                    {/* Connector Line */}
                    <div style={{
                        width: '60px',
                        height: '2px',
                        background: currentStep >= 2 ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease'
                    }}></div>

                    {/* Step 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: currentStep >= 2 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
                            border: currentStep >= 2 ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: currentStep >= 2 ? 'white' : 'rgba(255,255,255,0.4)',
                            fontWeight: '700',
                            fontSize: '14px',
                            transition: 'all 0.3s ease'
                        }}>
                            2
                        </div>
                        <span style={{
                            color: currentStep >= 2 ? 'white' : 'rgba(255,255,255,0.5)',
                            fontWeight: currentStep === 2 ? '600' : '400',
                            fontSize: '14px',
                            transition: 'all 0.3s ease'
                        }}>
                            Detaylı Bilgiler
                        </span>
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
                                <input type="text" name="firstName" placeholder="Ad *" value={formData.firstName} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }} required />
                                <input type="text" name="lastName" placeholder="Soyad *" value={formData.lastName} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <input type="text" name="company" placeholder="Şirket" value={formData.company} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }} />
                                <input type="text" name="title" placeholder="Ünvan" value={formData.title} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }} />
                            </div>

                            {/* İletişim Bilgileri */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <input type="email" name="email" placeholder="E-Posta *" value={formData.email} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }} />
                                <input type="text" name="phone" placeholder="Telefon *" value={formData.phone} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }} />
                            </div>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '-10px 0 0 0', fontStyle: 'italic' }}>
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
                            <fieldset style={{ border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', padding: '15px', margin: 0, background: 'rgba(255, 255, 255, 0.03)' }}>
                                <legend style={{ padding: '0 8px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95em', fontWeight: '500' }}>Adres Bilgileri</legend>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <textarea name="address" rows="2" placeholder="Açık Adres" value={formData.address} onChange={handleInputChange} style={{ ...inputStyle, width: '100%', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }}></textarea>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <input type="text" name="city" placeholder="Şehir" value={formData.city} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }} />
                                        <input type="text" name="country" placeholder="Ülke" value={formData.country} onChange={handleInputChange} style={inputStyle} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }} />
                                    </div>
                                </div>
                            </fieldset>

                            {/* CRM Extras: Tags & Reminders */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Etiketler</label>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                        padding: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {availableTags && availableTags.length > 0 ? availableTags.map(tag => (
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
                                                    borderColor: formData.tags.includes(tag.id) ? tag.color : 'rgba(255,255,255,0.1)',
                                                    background: formData.tags.includes(tag.id) ? tag.color : 'transparent',
                                                    color: formData.tags.includes(tag.id) ? 'white' : 'rgba(255,255,255,0.6)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        )) : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Etiket yükleniyor...</span>}
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

                            <textarea name="notes" rows="3" placeholder="Notlar..." value={formData.notes} onChange={handleInputChange} style={{ ...inputStyle, width: '100%', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} onFocus={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)'; }} onBlur={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }}></textarea>

                            <select name="visibility" value={formData.visibility} onChange={handleInputChange} style={{ ...inputStyle, width: '100%', cursor: 'pointer', fontWeight: '500' }}>
                                <option value="private" style={{ background: '#2a2a2a', color: 'white' }}>Sadece Ben (Private)</option>
                                <option value="public" style={{ background: '#2a2a2a', color: 'white' }}>Herkes (Public)</option>
                            </select>
                        </>
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
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                                }}
                                onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'; }}
                                onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'; }}
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
                                İleri: Detaylar →
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                style={{
                                    padding: '14px 24px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.15)'; e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)'; }}
                                onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.1)'; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'; }}
                            >
                                ← Geri
                            </button>
                            <button
                                type="submit"
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
                                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
                                }}
                                onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'; }}
                                onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)'; }}
                            >
                                {activeCard ? 'Güncelle' : 'Kaydet'}
                            </button>
                        </>
                    )}
                </div>
            </form>

            {/* OCR Onay Modalı / Overlay */}
            {showOcrConfirm && (
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
                        background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '30px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ color: 'white', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>🔍</span> Tarama Sonuçlarını Onayla
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '25px' }}>
                            Kartvizitten okunan bilgiler aşağıdadır. Lütfen doğruluğunu kontrol edin ve gerekiyorsa düzeltin.
                        </p>

                        <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#ffc107', fontSize: '0.8rem', fontWeight: 'bold' }}>AD</label>
                                    <input
                                        type="text"
                                        value={ocrResults.firstName}
                                        onChange={(e) => setOcrResults({ ...ocrResults, firstName: e.target.value })}
                                        style={inputStyle}
                                        placeholder="Ad..."
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#ffc107', fontSize: '0.8rem', fontWeight: 'bold' }}>SOYAD</label>
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
                                    <label style={{ color: '#ffc107', fontSize: '0.8rem', fontWeight: 'bold' }}>ŞİRKET</label>
                                    <input
                                        type="text"
                                        value={ocrResults.company}
                                        onChange={(e) => setOcrResults({ ...ocrResults, company: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#ffc107', fontSize: '0.8rem', fontWeight: 'bold' }}>ÜNVAN</label>
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
                                    <label style={{ color: '#ffc107', fontSize: '0.8rem', fontWeight: 'bold' }}>E-POSTA</label>
                                    <input
                                        type="text"
                                        value={ocrResults.email}
                                        onChange={(e) => setOcrResults({ ...ocrResults, email: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#ffc107', fontSize: '0.8rem', fontWeight: 'bold' }}>TELEFON</label>
                                    <input
                                        type="text"
                                        value={ocrResults.phone}
                                        onChange={(e) => setOcrResults({ ...ocrResults, phone: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ color: '#ffc107', fontSize: '0.8rem', fontWeight: 'bold' }}>WEB SİTESİ</label>
                                <input
                                    type="text"
                                    value={ocrResults.website}
                                    onChange={(e) => setOcrResults({ ...ocrResults, website: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ color: '#ffc107', fontSize: '0.8rem', fontWeight: 'bold' }}>ADRES</label>
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
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.1)',
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
                                    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                Onayla ve Aktar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Logo Kırpma Modalı */}
            {showLogoCrop && (
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
                    <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.2)', maxWidth: '90%', maxHeight: '90%', overflow: 'auto' }}>
                        <h4 style={{ color: 'white', marginTop: 0 }}>Şirket Logosunu Seçin</h4>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '15px' }}>Lütfen logoyu içeren alanı 4 köşe ile işaretleyin.</p>
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
                            style={{ marginTop: '15px', padding: '10px 20px', background: 'transparent', color: 'white', border: '1px solid #444', borderRadius: '12px', cursor: 'pointer' }}
                        >Vazgeç</button>
                    </div>
                </div>
            )}
            {/* Mükerrer Kayıt Uyarısı */}
            {showDuplicateAlert && duplicateCard && (
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
                        background: 'rgba(30, 30, 35, 0.95)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '500px',
                        padding: '30px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
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
                        <h3 style={{ color: '#ffc107', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Benzer Kayıt Tespit Edildi!</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '25px' }}>
                            <b>{duplicateCard.firstName} {duplicateCard.lastName}</b> adına zaten bir kayıt mevcut.
                        </p>

                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '20px',
                            marginBottom: '30px',
                            textAlign: 'left',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontSize: '0.9rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Şirket:</span>
                                <span>{duplicateCard.company || '-'}</span>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>E-Posta:</span>
                                <span>{duplicateCard.email || '-'}</span>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Ekleyen:</span>
                                <span style={{ color: '#4ade80' }}>@{duplicateCard.owner?.displayName || 'Sistem'}</span>
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
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
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
                                    background: 'rgba(255,255,255,0.08)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.1)',
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
                                    color: 'rgba(255,255,255,0.5)',
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
            )}
        </div>
    );
};

export default AddCard;
