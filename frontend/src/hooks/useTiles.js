import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';

export default function useTiles() {
    const { t } = useTranslation('dashboard');
    const { showNotification } = useNotification();

    const [tiles, setTiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentTile, setCurrentTile] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        url: '',
        icon: 'FaLink',
        backgroundColor: 'rgba(96, 60, 186, 0.3)',
        order: 0,
        isInternal: true,
    });
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const fetchTiles = async () => {
        try {
            const res = await api.get('/api/db-tiles');
            setTiles(res.data || []);
        } catch (err) {
            console.warn('/api/db-tiles endpointinden veri alınamadı:', err.message);
            setTiles([]);
        }
    };

    const openModal = (tile = null) => {
        if (tile) {
            setCurrentTile(tile);
            setFormData({
                title: tile.title,
                subtitle: tile.subtitle || '',
                url: tile.url,
                icon: tile.icon,
                backgroundColor: tile.backgroundColor,
                order: tile.order,
                isInternal: tile.isInternal,
            });
        } else {
            setCurrentTile(null);
            setFormData({
                title: '',
                subtitle: '',
                url: '',
                icon: 'FaLink',
                backgroundColor: 'rgba(96, 60, 186, 0.3)',
                order: tiles.length + 1,
                isInternal: true,
            });
        }
        setShowModal(true);
    };

    const handleSaveTile = async (e) => {
        e.preventDefault();
        try {
            if (currentTile) {
                await api.put(`/api/db-tiles/${currentTile.id}`, formData);
            } else {
                await api.post('/api/db-tiles', formData);
            }
            await fetchTiles();
            setShowModal(false);
            showNotification(t('tile.saved'), 'success');
        } catch (error) {
            showNotification(t('tile.saveError', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    const handleDeleteTile = async () => {
        if (!deleteConfirmId) return;
        try {
            await api.delete(`/api/db-tiles/${deleteConfirmId}`);
            setDeleteConfirmId(null);
            await fetchTiles();
            showNotification(t('tile.deleted'), 'success');
        } catch (error) {
            showNotification(t('tile.deleteError', { error: error.response?.data?.error || error.message }), 'error');
        }
    };

    return {
        tiles,
        setTiles,
        loading,
        setLoading,
        showModal,
        setShowModal,
        currentTile,
        formData,
        setFormData,
        deleteConfirmId,
        setDeleteConfirmId,
        openModal,
        handleSaveTile,
        handleDeleteTile,
        fetchTiles,
    };
}
