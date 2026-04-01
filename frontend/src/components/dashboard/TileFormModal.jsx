import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/Modal';
import { hexToRgba, rgbaToHex } from '../../utils/helpers';

const TileFormModal = ({ isOpen, onClose, currentTile, formData, setFormData, onSave }) => {
    const { t } = useTranslation(['dashboard', 'common']);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={currentTile ? t('dashboard:tile.editTitle') : t('dashboard:tile.addTitle')}
        >
            <form onSubmit={onSave} style={{ color: 'var(--text-primary)' }}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.title')}</label>
                    <input
                        type="text"
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)'
                        }}
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.subtitle')}</label>
                    <input
                        type="text"
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)'
                        }}
                        value={formData.subtitle}
                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.url')}</label>
                    <input
                        type="text"
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)'
                        }}
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        placeholder={t('dashboard:tile.form.urlPlaceholder')}
                        required
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.icon')}</label>
                        <input
                            type="text"
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)'
                            }}
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.color')}</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
                                type="color"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    padding: '0',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                                value={rgbaToHex(formData.backgroundColor)}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    backgroundColor: hexToRgba(e.target.value)
                                })}
                            />
                            <input
                                type="text"
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem'
                                }}
                                value={formData.backgroundColor}
                                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>{t('dashboard:tile.form.order')}</label>
                        <input
                            type="number"
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)'
                            }}
                            value={formData.order}
                            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '25px' }}>
                        <input
                            type="checkbox"
                            id="isInternal"
                            checked={formData.isInternal}
                            onChange={(e) => setFormData({ ...formData, isInternal: e.target.checked })}
                            style={{ marginRight: '10px' }}
                        />
                        <label htmlFor="isInternal">{t('dashboard:tile.form.isInternal')}</label>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {t('common:cancel')}
                    </button>
                    <button
                        type="submit"
                        style={{
                            padding: '10px 20px',
                            background: 'var(--accent-primary)',
                            color: 'var(--bg-card)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        {currentTile ? t('common:update') : t('common:add')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TileFormModal;
