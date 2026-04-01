import { useState } from 'react';
import Tesseract from 'tesseract.js';
import api from '../api/axios';

export default function useCardOcr({ user, showNotification, t }) {
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrResults, setOcrResults] = useState(null);
    const [showOcrConfirm, setShowOcrConfirm] = useState(false);
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
                // Cache so we don't call AI again for OCR
                setPreFetchedAiData(response.data);
                showNotification(t('addCard.ai.boundaryDetected'), 'success');
            }
        } catch (err) {
            console.error('AI Detection Error:', err);
            const errorMsg = err.response?.data?.error || '';
            showNotification(`${errorMsg} ${t('addCard.ai.manualBoundaryHint')}`, 'warning');
        } finally {
            setIsDetecting(false);
        }
    };

    const performOCR = async (fileBlob) => {
        setOcrLoading(true);
        try {
            // Use AI OCR if enabled
            if (user?.aiOcrEnabled) {
                try {
                    // Use pre-fetched data if available
                    if (preFetchedAiData) {
                        setOcrResults(preFetchedAiData);
                        setShowOcrConfirm(true);
                        showNotification(t('addCard.ai.resultsPrefetched'), 'success');
                        setOcrLoading(false);
                        return;
                    }

                    // Fallback: re-send to backend
                    const formDataAi = new FormData();
                    formDataAi.append('image', fileBlob, 'card.jpg');

                    const response = await api.post('/api/cards/analyze-ai', formDataAi, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    setOcrResults(response.data);
                    setShowOcrConfirm(true);
                    showNotification(t('addCard.ai.scanComplete'), 'success');
                    setOcrLoading(false);
                    return;
                } catch (aiErr) {
                    console.error('AI OCR Hatası, Tesseract\'a dönülüyor:', aiErr);
                    const msg = aiErr.response?.data?.error || '';
                    showNotification(t('addCard.ai.fallbackToTesseract', { message: msg }), 'warning');
                    // Fall through to Tesseract
                }
            }

            // Tesseract OCR
            const blobUrl = URL.createObjectURL(fileBlob);
            const result = await Tesseract.recognize(blobUrl, 'tur');
            const text = result.data.text;

            // Regex and keyword-based extraction
            let emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);

            // Handle OCR misread of @ as O or 0
            if (!emailMatch) {
                const brokenEmailMatch = text.match(/([a-zA-Z0-9._-]+[O0][a-zA-Z0-9._-]+\.(com|net|org|edu|gov|tr|info|biz))/gi);
                if (brokenEmailMatch) {
                    emailMatch = brokenEmailMatch.map(e => e.replace(/[O0](?=[^.O0]+\.)/, '@'));
                }
            }

            const phoneMatch = text.match(/((\+90|0)?\s*\(?\d{3}\)?\s*\d{3}\s*\d{2}\s*\d{2})/);

            let websiteMatches = text.match(/(https?:\/\/|www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi);
            let finalWebsite = '';

            if (websiteMatches) {
                const filteredWebsites = websiteMatches.filter(w => {
                    const isEmail = w.includes('@') || (emailMatch && emailMatch.some(e => e.includes(w)));
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

                if (addressKeywords.some(kw => lower.includes(kw))) {
                    extractedAddress += (extractedAddress ? ' ' : '') + line;
                } else if (companyKeywords.some(kw => lower.includes(kw))) {
                    extractedCompany = line;
                } else if (titleKeywords.some(kw => lower.includes(kw))) {
                    extractedTitle = line;
                } else if (index < 3 && !extractedFirstName && line.split(' ').length <= 3) {
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
            const errorMsg = err.response?.data?.error || t('addCard.ocr.error');
            showNotification(errorMsg, 'error');
        } finally {
            setOcrLoading(false);
        }
    };

    return {
        ocrLoading,
        ocrResults,
        showOcrConfirm,
        setShowOcrConfirm,
        aiDetectedPoints,
        isDetecting,
        preFetchedAiData,
        setPreFetchedAiData,
        detectAiBoundary,
        performOCR,
        setOcrResults,
        setAiDetectedPoints,
    };
}
