import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { FaFileUpload, FaDownload, FaExclamationTriangle, FaCheckCircle, FaSpinner, FaArrowLeft, FaAddressCard } from 'react-icons/fa';

const ImportCards = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
    };

    const handleDownloadTemplate = async (format) => {
        try {
            const response = await api.get(`/api/cards/import/template?format=${format}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `kartvizit_sablon.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            showNotification('Şablon indirilemedi.', 'error');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            showNotification('Lütfen bir dosya seçin.', 'error');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/api/cards/import/bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            if (res.data.importedCount > 0) {
                showNotification(`${res.data.importedCount} kartvizit başarıyla eklendi.`, 'success');
            }
        } catch (error) {
            showNotification('Yükleme sırasında hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                    <FaArrowLeft />
                </button>
                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: 'white' }}>
                    Toplu İçe Aktarma (Bulk Import)
                </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {/* Step 1: Template */}
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#60a5fa', fontSize: '1.2rem' }}>1. Şablonu İndirin</h4>
                    <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>
                        Verilerinizi doğru formatta yüklemek için şablonu kullanın. (*) işaretli alanlar zorunludur.
                    </p>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={() => handleDownloadTemplate('xlsx')} style={btnSecondary}>
                            <FaDownload /> XLSX Şablonu
                        </button>
                        <button onClick={() => handleDownloadTemplate('csv')} style={btnSecondary}>
                            <FaDownload /> CSV Şablonu
                        </button>
                        <div style={{
                            marginLeft: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#fbbf24',
                            fontSize: '0.9rem',
                            background: 'rgba(251, 191, 36, 0.1)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(251, 191, 36, 0.2)'
                        }}>
                            <FaAddressCard /> vCard (.vcf) Doğrudan Desteklenir
                        </div>
                    </div>
                </div>

                {/* Step 2: Upload */}
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#60a5fa', fontSize: '1.2rem' }}>2. Dosyayı Yükleyin</h4>
                    <input
                        type="file"
                        accept=".xlsx,.csv,.vcf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="bulk-file-input"
                    />
                    <label htmlFor="bulk-file-input" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '15px',
                        padding: '40px 20px',
                        border: '2px dashed rgba(255,255,255,0.2)',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        color: file ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.2s',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        <FaFileUpload size={48} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                {file ? file.name : 'Dosyayı Sürükleyin veya Seçin'}
                            </div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '5px' }}>
                                Desteklenen formatlar: .xlsx, .csv, .vcf
                            </div>
                        </div>
                    </label>

                    {file && !result && (
                        <button
                            onClick={handleUpload}
                            disabled={loading}
                            style={{ ...btnPrimary, marginTop: '20px', width: '100%', padding: '15px' }}
                        >
                            {loading ? <><FaSpinner className="spin" /> İşleniyor...</> : 'İşlemi Başlat'}
                        </button>
                    )}
                </div>

                {/* Step 3: Result Summary */}
                {result && (
                    <div style={cardStyle}>
                        <h4 style={{ margin: '0 0 20px 0', color: '#60a5fa', fontSize: '1.2rem' }}>İşlem Özeti</h4>
                        <div style={{ display: 'flex', gap: '30px', marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4ade80', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                <FaCheckCircle /> {result.importedCount} Başarılı
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                <FaExclamationTriangle /> {result.errorCount} Hata
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div style={{
                                maxHeight: '300px',
                                overflowY: 'auto',
                                fontSize: '0.9rem',
                                color: '#f87171',
                                background: 'rgba(248, 113, 113, 0.1)',
                                padding: '15px',
                                borderRadius: '12px',
                                border: '1px solid rgba(248, 113, 113, 0.2)'
                            }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Hata Detayları:</div>
                                {result.errors.map((err, i) => <div key={i} style={{ marginBottom: '5px' }}>• {err}</div>)}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                            <button onClick={() => navigate('/contacts')} style={{ ...btnPrimary, flex: 1 }}>
                                Kartvizitlere Git
                            </button>
                            <button onClick={() => { setFile(null); setResult(null); }} style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}>
                                Yeni Yükleme Yap
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const cardStyle = {
    padding: '25px',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
};

const btnPrimary = {
    padding: '12px 24px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s'
};

const btnSecondary = {
    padding: '12px 20px',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s'
};

export default ImportCards;
