import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import {
    FaFileUpload,
    FaDownload,
    FaExclamationTriangle,
    FaCheckCircle,
    FaSpinner,
    FaArrowLeft,
    FaAddressCard,
} from 'react-icons/fa';

const ImportCards = () => {
    const { t } = useTranslation(['pages', 'common']);
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
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `kartvizit_sablon.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            showNotification(t('pages:import.templateDownloadError'), 'error');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            showNotification(t('pages:import.noFileSelected'), 'error');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/api/cards/import/bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data);
            if (res.data.importedCount > 0) {
                showNotification(t('pages:import.importSuccess', { count: res.data.importedCount }), 'success');
            }
        } catch (error) {
            showNotification(t('pages:import.uploadError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                <button
                    onClick={() => navigate('/')}
                    className="glass-button"
                    style={{
                        padding: '10px',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                    }}
                >
                    <FaArrowLeft />
                </button>
                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>{t('pages:import.title')}</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {/* Step 1: Template */}
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                        {t('pages:import.step1Title')}
                    </h4>
                    <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        {t('pages:import.step1Description')}
                    </p>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={() => handleDownloadTemplate('xlsx')} style={btnSecondary}>
                            <FaDownload /> {t('pages:import.xlsxTemplate')}
                        </button>
                        <button onClick={() => handleDownloadTemplate('csv')} style={btnSecondary}>
                            <FaDownload /> {t('pages:import.csvTemplate')}
                        </button>
                        <div
                            style={{
                                marginLeft: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--accent-warning)',
                                fontSize: '0.9rem',
                                background: 'rgba(var(--accent-warning-rgb), 0.1)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                            }}
                        >
                            <FaAddressCard /> {t('pages:import.vcfSupported')}
                        </div>
                    </div>
                </div>

                {/* Step 2: Upload */}
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                        {t('pages:import.step2Title')}
                    </h4>
                    <input
                        type="file"
                        accept=".xlsx,.csv,.vcf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="bulk-file-input"
                    />
                    <label
                        htmlFor="bulk-file-input"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '15px',
                            padding: '40px 20px',
                            border: '2px dashed var(--glass-border)',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            color: file ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                            transition: 'all 0.2s',
                            background: 'var(--bg-input)',
                        }}
                    >
                        <FaFileUpload size={48} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                {file ? file.name : t('pages:import.dragOrSelect')}
                            </div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '5px' }}>
                                {t('pages:import.supportedFormats')}
                            </div>
                        </div>
                    </label>

                    {file && !result && (
                        <button
                            onClick={handleUpload}
                            disabled={loading}
                            style={{ ...btnPrimary, marginTop: '20px', width: '100%', padding: '15px' }}
                        >
                            {loading ? (
                                <>
                                    <FaSpinner className="spin" /> {t('common:processing')}
                                </>
                            ) : (
                                t('pages:import.startImport')
                            )}
                        </button>
                    )}
                </div>

                {/* Step 3: Result Summary */}
                {result && (
                    <div style={cardStyle}>
                        <h4 style={{ margin: '0 0 20px 0', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                            {t('pages:import.resultSummary')}
                        </h4>
                        <div
                            style={{
                                display: 'flex',
                                gap: '30px',
                                marginBottom: '20px',
                                padding: '15px',
                                background: 'var(--bg-input)',
                                borderRadius: '12px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: 'var(--accent-success)',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                <FaCheckCircle /> {result.importedCount} {t('pages:import.successful')}
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: 'var(--accent-error)',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                <FaExclamationTriangle /> {result.errorCount} {t('pages:import.errors')}
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div
                                style={{
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    fontSize: '0.9rem',
                                    color: 'var(--accent-error)',
                                    background: 'rgba(var(--accent-error-rgb), 0.1)',
                                    padding: '15px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--glass-border)',
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                                    {t('pages:import.errorDetails')}
                                </div>
                                {result.errors.map((err, i) => (
                                    <div key={i} style={{ marginBottom: '5px' }}>
                                        • {err}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                            <button onClick={() => navigate('/contacts')} style={{ ...btnPrimary, flex: 1 }}>
                                {t('pages:import.goToContacts')}
                            </button>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setResult(null);
                                }}
                                style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}
                            >
                                {t('pages:import.newUpload')}
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
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
};

const btnPrimary = {
    padding: '12px 24px',
    background: 'var(--accent-primary)',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s',
};

const btnSecondary = {
    padding: '12px 20px',
    background: 'var(--glass-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s',
};

export default ImportCards;
