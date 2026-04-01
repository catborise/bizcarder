import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import ConfirmModal from '../shared/ConfirmModal';

const inputStyle = {
    width: '100%',
    padding: '12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    marginTop: '8px'
};

const TagManagement = () => {
    const { t } = useTranslation('settings');
    const { showNotification } = useNotification();

    const [tags, setTags] = useState([]);
    const [tagForm, setTagForm] = useState({ name: '', color: 'var(--accent-primary)' });
    const [editingTag, setEditingTag] = useState(null);
    const [deleteTagConfirmId, setDeleteTagConfirmId] = useState(null);

    const fetchTags = async () => {
        try {
            const res = await api.get('/api/tags');
            setTags(res.data);
        } catch (error) {
            console.error('Tags fetch error:', error);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    const handleTagSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTag) {
                await api.put(`/api/tags/${editingTag.id}`, tagForm);
                showNotification(t('notify.tagUpdated'), 'success');
            } else {
                await api.post('/api/tags', tagForm);
                showNotification(t('notify.tagAdded'), 'success');
            }
            setTagForm({ name: '', color: 'var(--accent-primary)' });
            setEditingTag(null);
            fetchTags();
        } catch (error) {
            showNotification(t('notify.tagFailed', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    const handleDeleteTag = async () => {
        if (!deleteTagConfirmId) return;
        try {
            await api.delete(`/api/tags/${deleteTagConfirmId}`);
            setDeleteTagConfirmId(null);
            showNotification(t('notify.tagDeleted'), 'success');
            fetchTags();
        } catch (error) {
            showNotification(t('notify.deleteFailed'), 'error');
        }
    };

    const handleEditTag = (tag) => {
        setEditingTag(tag);
        setTagForm({ name: tag.name, color: tag.color });
    };

    return (
        <div>
            <form onSubmit={handleTagSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '25px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('tags.nameLabel')}</label>
                    <input
                        type="text"
                        value={tagForm.name}
                        onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                        style={inputStyle}
                        required
                    />
                </div>
                <div>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('tags.colorLabel')}</label>
                    <input
                        type="color"
                        value={tagForm.color}
                        onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                        style={{ ...inputStyle, padding: '5px', height: '45px', width: '60px' }}
                    />
                </div>
                <button
                    type="submit"
                    style={{
                        background: editingTag ? 'var(--accent-warning)' : 'var(--accent-primary)',
                        color: 'var(--bg-card)',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    {editingTag ? t('tags.updateBtn') : t('tags.addBtn')}
                </button>
            </form>

            <div style={{ display: 'grid', gap: '10px' }}>
                {tags.map((tag) => (
                    <div
                        key={tag.id}
                        style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 15px', background: 'var(--bg-input)', borderRadius: '10px',
                            border: '1px solid var(--glass-border)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: tag.color }}></div>
                            <span>{tag.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => handleEditTag(tag)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                                ✏️
                            </button>
                            <button
                                onClick={() => setDeleteTagConfirmId(tag.id)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal
                isOpen={!!deleteTagConfirmId}
                onClose={() => setDeleteTagConfirmId(null)}
                onConfirm={handleDeleteTag}
                title={t('tags.deleteTitle')}
                message={t('tags.deleteMessage')}
            />
        </div>
    );
};

export default TagManagement;
