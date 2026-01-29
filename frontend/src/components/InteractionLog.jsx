import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const InteractionLog = ({ cardId }) => {
    const [interactions, setInteractions] = useState([]);
    const [formData, setFormData] = useState({
        type: 'Toplantı',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchInteractions = async () => {
        try {
            const res = await api.get(`/api/interactions/${cardId}`);
            setInteractions(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (cardId) fetchInteractions();
    }, [cardId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/interactions/${cardId}`, formData);
            setFormData(prev => ({ ...prev, notes: '' })); // Notu temizle
            fetchInteractions(); // Listeyi yenile
        } catch (err) {
            console.error(err);
            alert('Hata!');
        }
    };

    return (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#333', borderRadius: '5px' }}>
            <h4>Görüşme Kayıtları (CRM)</h4>

            <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '10px' }}>
                {interactions.length === 0 && <p style={{ color: '#888' }}>Henüz kayıt yok.</p>}
                {interactions.map(log => (
                    <div key={log.id} style={{ borderBottom: '1px solid #444', padding: '5px 0', fontSize: '0.9rem' }}>
                        <strong>{new Date(log.date).toLocaleDateString()} - {log.type}:</strong>
                        <p style={{ margin: '2px 0' }}>{log.notes}</p>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '5px' }}>
                <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    style={{ padding: '5px' }}
                >
                    <option>Toplantı</option>
                    <option>Arama</option>
                    <option>E-posta</option>
                    <option>Sipariş</option>
                </select>
                <input
                    type="text"
                    placeholder="Notunuz..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    required
                    style={{ flex: 1, padding: '5px' }}
                />
                <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    style={{ padding: '5px' }}
                />
                <button type="submit" style={{ cursor: 'pointer', padding: '5px 10px' }}>Ekle</button>
            </form>
        </div>
    );
};

export default InteractionLog;
