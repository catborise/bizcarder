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

    // Kamera Başlatma
    const startCamera = async (side) => {
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
                        height: { ideal: 1080 }
                    },
                    audio: false
                });
            } catch {
                // exact: environment başarısız olduysa fallback
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                });
            }

            streamRef.current = stream;

            // Video element'inin render edilmesini bekle
            const waitForVideo = () => {
                return new Promise((resolve) => {
                    const check = () => {
                        if (videoRef.current) {
                            resolve();
                        } else {
                            requestAnimationFrame(check);
                        }
                    };
                    check();
                });
            };
            await waitForVideo();

            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setCameraReady(true);
        } catch (err) {
            console.error('Kamera erişim hatası:', err);

            // Stream alındıysa temizle
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
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
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
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

        canvas.toBlob(async (blob) => {
            if (!blob) return;

            const capturedSide = cameraSide;

            // Kamerayı kapat
            stopCameraStream();
            setShowCameraModal(false);

            // Dosya nesnesine dönüştür ve onCapture callback'i çağır
            const file = new File([blob], `camera_${capturedSide}_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file, capturedSide);
        }, 'image/jpeg', 0.92);
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
        if (showCameraModal && cameraSide) {
            startCamera(cameraSide);
        }
        return () => {
            // Cleanup: sadece stream'i kapat, state değiştirme
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
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
