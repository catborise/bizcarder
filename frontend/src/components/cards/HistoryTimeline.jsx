import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUser, FaClock, FaPen, FaPlus, FaTrash, FaUndo } from 'react-icons/fa';
import api from '../../api/axios';

const HistoryTimeline = ({ cardId }) => {
    const { t } = useTranslation(['pages', 'common']);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get(`/api/cards/${cardId}/history`);
                setHistory(res.data);
            } catch (err) {
                console.error('History fetch error:', err);
                setError(t('pages:history.loadError'));
            } finally {
                setLoading(false);
            }
        };

        if (cardId) fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardId]);

    if (loading)
        return (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
                {t('common:loading')}
            </div>
        );
    if (error) return <div style={{ textAlign: 'center', color: 'var(--accent-error)', padding: '20px' }}>{error}</div>;
    if (history.length === 0)
        return (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
                {t('pages:history.noRecords')}
            </div>
        );

    const getIcon = (type) => {
        switch (type) {
            case 'CREATE':
                return <FaPlus />;
            case 'UPDATE':
                return <FaPen />;
            case 'SOFT_DELETE':
                return <FaTrash />;
            case 'RESTORE':
                return <FaUndo />;
            default:
                return <FaClock />;
        }
    };

    const getLabel = (type) => {
        switch (type) {
            case 'CREATE':
                return t('pages:history.action.created');
            case 'UPDATE':
                return t('pages:history.action.updated');
            case 'SOFT_DELETE':
                return t('pages:history.action.softDeleted');
            case 'RESTORE':
                return t('pages:history.action.restored');
            default:
                return t('pages:history.action.default');
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'CREATE':
                return '#28a745';
            case 'UPDATE':
                return '#ffc107';
            case 'SOFT_DELETE':
                return '#dc3545';
            case 'RESTORE':
                return '#17a2b8';
            default:
                return '#6c757d';
        }
    };

    const formatSnapshotValue = (val) => {
        if (val === null || val === undefined || val === '') return t('pages:history.emptyValue');
        if (typeof val === 'object') {
            try {
                return JSON.stringify(val);
            } catch {
                return String(val);
            }
        }
        return String(val);
    };

    // Değişiklikleri tespit etmek için helper
    const getChanges = (currentSnapshot, prevSnapshot) => {
        if (!currentSnapshot || !prevSnapshot) return null;
        const changes = [];
        const ignoreFields = ['updatedAt', 'createdAt', 'version', 'deletedAt', 'deletedBy'];

        Object.keys(currentSnapshot).forEach((key) => {
            if (ignoreFields.includes(key)) return;
            const curVal = currentSnapshot[key];
            const prevVal = prevSnapshot[key];
            const isDifferent =
                typeof curVal === 'object' || typeof prevVal === 'object'
                    ? JSON.stringify(curVal) !== JSON.stringify(prevVal)
                    : curVal !== prevVal;
            if (isDifferent) {
                changes.push({
                    field: key,
                    from: prevVal,
                    to: curVal,
                });
            }
        });
        return changes;
    };

    return (
        <div className="timeline-container" style={{ position: 'relative', padding: '10px 0' }}>
            {history.map((record, index) => {
                const nextRecord = history[index + 1]; // Bir önceki versiyon (tarihsel olarak daha eski)
                const changes =
                    record.changeType === 'UPDATE' ? getChanges(record.snapshot, nextRecord?.snapshot) : null;

                return (
                    <div
                        key={record.id}
                        style={{
                            display: 'flex',
                            gap: '20px',
                            marginBottom: '30px',
                            position: 'relative',
                        }}
                    >
                        {/* Çizgi */}
                        {index !== history.length - 1 && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: '19px',
                                    top: '40px',
                                    bottom: '-30px',
                                    width: '2px',
                                    background: 'var(--glass-border)',
                                }}
                            />
                        )}

                        {/* İkon */}
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--glass-bg)',
                                border: `2px solid ${getColor(record.changeType)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: getColor(record.changeType),
                                fontSize: '16px',
                                zIndex: 2,
                                flexShrink: 0,
                            }}
                        >
                            {getIcon(record.changeType)}
                        </div>

                        {/* İçerik */}
                        <div
                            style={{
                                flex: 1,
                                background: 'var(--glass-bg)',
                                padding: '15px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '8px',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <div>
                                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 'bold' }}>
                                        {getLabel(record.changeType)}{' '}
                                        <span style={{ fontSize: '0.8em', opacity: 0.6, fontWeight: 'normal' }}>
                                            (v{record.version})
                                        </span>
                                    </h4>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            color: 'var(--text-secondary)',
                                            marginTop: '4px',
                                        }}
                                    >
                                        <FaUser size={12} />{' '}
                                        {record.editor
                                            ? record.editor.displayName || record.editor.username
                                            : t('pages:history.system')}
                                        <span>•</span>
                                        <FaClock size={12} /> {new Date(record.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Değişiklik Detayları */}
                            {changes && changes.length > 0 && (
                                <div
                                    style={{
                                        marginTop: '10px',
                                        background: 'var(--bg-input)',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--glass-border)',
                                    }}
                                >
                                    {changes.map((change, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                fontSize: '13px',
                                                marginBottom: '4px',
                                                color: 'var(--text-secondary)',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            <strong style={{ color: 'var(--text-primary)' }}>{change.field}:</strong>{' '}
                                            <span
                                                style={{ color: 'var(--accent-error)', textDecoration: 'line-through' }}
                                            >
                                                {formatSnapshotValue(change.from)}
                                            </span>
                                            {' -> '}
                                            <span style={{ color: 'var(--accent-success)' }}>
                                                {formatSnapshotValue(change.to)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Create Snapshot Özeti (Opsiyonel) */}
                            {record.changeType === 'CREATE' && record.snapshot && (
                                <div
                                    style={{
                                        marginTop: '10px',
                                        fontSize: '13px',
                                        color: 'var(--text-tertiary)',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    {t('pages:history.initialCreation', {
                                        firstName: record.snapshot.firstName || '',
                                        lastName: record.snapshot.lastName || '',
                                        company: record.snapshot.company || '',
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default HistoryTimeline;
