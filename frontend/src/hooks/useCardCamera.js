import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';

/**
 * useCardCamera
 *
 * Manages camera state, stream lifecycle, and photo capture for the card scanner.
 *
 * @param {object} config
 * @param {function} config.onCapture - Called with (file, side) after a photo is captured.
 */
export default function useCardCamera({ onCapture }) {
    const { t } = useTranslation(['cards', 'common']);
    const { showNotification } = useNotification();

    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraSide, setCameraSide] = useState(null); // 'front' | 'back'
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const activeSessionRef = useRef(0);

    // Kamera Başlatma
    const startCamera = async (_side) => {
        const sessionId = ++activeSessionRef.current;
        setCameraReady(false);
        setCameraError(null);

        // getUserMedia desteği yoksa native file input'a fallback
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError('no-support');
            return;
        }

        try {
            // İlk olarak arka kamerayı dene, başarısız olursa herhangi bir kamerayı dene
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { exact: 'environment' },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });
            } catch {
                // exact: environment başarısız olduysa fallback
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });
            }

            // If modal closed or unmounted while getUserMedia was pending, stop tracks immediately
            if (activeSessionRef.current !== sessionId) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            streamRef.current = stream;

            // Video element'inin render edilmesini bekle (cancellation-safe, max 100 frames)
            const waitForVideo = () => {
                return new Promise((resolve) => {
                    let attempts = 0;
                    const check = () => {
                        if (activeSessionRef.current !== sessionId || videoRef.current || attempts >= 100) {
                            resolve();
                        } else {
                            attempts++;
                            requestAnimationFrame(check);
                        }
                    };
                    check();
                });
            };
            await waitForVideo();

            if (activeSessionRef.current !== sessionId || !videoRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                if (streamRef.current === stream) streamRef.current = null;
                return;
            }

            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            if (activeSessionRef.current === sessionId) {
                setCameraReady(true);
            }
        } catch (err) {
            if (activeSessionRef.current !== sessionId) return;
            console.error('Kamera erişim hatası:', err);

            // Stream alındıysa temizle
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCameraError('permission');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setCameraError('not-found');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setCameraError('in-use');
            } else {
                setCameraError('unknown');
            }
        }
    };

    const stopCameraStream = () => {
        activeSessionRef.current++;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraReady(false);
        setCameraError(null);
    };

    const closeCamera = () => {
        stopCameraStream();
        setShowCameraModal(false);
    };

    const fallbackToFileInput = (side) => {
        closeCamera();
        // Native kamera capture input'unu kullan (mobilde doğrudan kamera açar)
        const inputId = side === 'front' ? 'frontCamera' : 'backCamera';
        const el = document.getElementById(inputId);
        if (el) {
            el.click();
        } else {
            // Camera input yoksa normal file input'u aç
            document.getElementById(side === 'front' ? 'frontInput' : 'backInput')?.click();
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
            showNotification(t('addCard.camera.notReady'), 'warning');
            return;
        }

        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(
            async (blob) => {
                if (!blob) return;

                const capturedSide = cameraSide;

                // Kamerayı kapat
                stopCameraStream();
                setShowCameraModal(false);

                // Dosya nesnesine dönüştür ve onCapture callback'i çağır
                const file = new File([blob], `camera_${capturedSide}_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file, capturedSide);
            },
            'image/jpeg',
            0.92,
        );
    };

    const openCamera = (side) => {
        // getUserMedia desteği yoksa direkt native kamera input'una yönlendir
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            fallbackToFileInput(side);
            return;
        }
        setCameraSide(side);
        setShowCameraModal(true);
    };

    // Kamera yaşam döngüsü: modal açıldığında kamerayı başlat, kapandığında stream'i temizle
    useEffect(() => {
        const sessionRef = activeSessionRef;
        if (showCameraModal && cameraSide) {
            startCamera(cameraSide);
        }
        return () => {
            // Invalidate any pending getUserMedia / waitForVideo and stop active tracks
            sessionRef.current++;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showCameraModal]);

    return {
        showCameraModal,
        cameraSide,
        cameraReady,
        cameraError,
        videoRef,
        streamRef,
        openCamera,
        closeCamera,
        capturePhoto,
        fallbackToFileInput,
    };
}
