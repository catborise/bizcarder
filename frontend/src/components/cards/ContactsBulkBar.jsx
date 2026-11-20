import { motion, AnimatePresence } from 'framer-motion';
import { FaIdCard, FaGlobe, FaTrash, FaFileExcel, FaFilePdf, FaStar } from 'react-icons/fa';
import { API_URL } from '../../api/axios';
import Modal from '../shared/Modal';
import ConfirmModal from '../shared/ConfirmModal';

export const CardImageModal = ({ t, selectedImageCard, onClose }) => (
    <Modal
        title={
            selectedImageCard
                ? `${selectedImageCard.firstName} ${selectedImageCard.lastName}`
                : t('cards:contacts.modal.image')
        }
        isOpen={!!selectedImageCard}
        onClose={onClose}
    >
        {selectedImageCard && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <h4 style={{ color: 'var(--accent-primary)', textAlign: 'center', marginBottom: '10px' }}>
                        {t('cards:contacts.modal.frontSide')}
                    </h4>
                    <img
                        src={`${API_URL}${selectedImageCard.frontImageUrl}`}
                        alt={t('cards:contacts.modal.frontSide')}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '60vh',
                            borderRadius: '8px',
                            border: '1px solid var(--glass-border)',
                            boxShadow: 'var(--glass-shadow)',
                        }}
                    />
                </div>
                {selectedImageCard.backImageUrl && (
                    <div>
                        <h4 style={{ color: 'var(--accent-warning)', textAlign: 'center', marginBottom: '10px' }}>
                            {t('cards:contacts.modal.backSide')}
                        </h4>
                        <img
                            src={`${API_URL}${selectedImageCard.backImageUrl}`}
                            alt={t('cards:contacts.modal.backSide')}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '60vh',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-border)',
                                boxShadow: 'var(--glass-shadow)',
                            }}
                        />
                    </div>
                )}
            </div>
        )}
    </Modal>
);

const ContactsBulkBar = ({
    t,
    selectedIds,
    setSelectedIds,
    availableTags,
    isBulkTagModalOpen,
    setIsBulkTagModalOpen,
    bulkTagAction,
    setBulkTagAction,
    selectedBulkTags,
    setSelectedBulkTags,
    onBulkTags,
    onBulkVisibility,
    onBulkExport,
    isBulkDeleteConfirmOpen,
    setIsBulkDeleteConfirmOpen,
    onBulkDelete,
    isVcfExportConfirmOpen,
    setIsVcfExportConfirmOpen,
    onBulkVcfExport,
}) => {
    return (
        <>
            <Modal
                title={t('cards:contacts.modal.bulkTagTitle')}
                isOpen={isBulkTagModalOpen}
                onClose={() => setIsBulkTagModalOpen(false)}
            >
                <div style={{ padding: '10px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                            {t('cards:contacts.modal.actionType')}
                        </label>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="radio"
                                    name="bulkTagAction"
                                    value="add"
                                    checked={bulkTagAction === 'add'}
                                    onChange={(e) => setBulkTagAction(e.target.value)}
                                />
                                {t('cards:contacts.bulkTag.addToExisting')}
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="radio"
                                    name="bulkTagAction"
                                    value="replace"
                                    checked={bulkTagAction === 'replace'}
                                    onChange={(e) => setBulkTagAction(e.target.value)}
                                />
                                {t('cards:contacts.bulkTag.replaceAll')}
                            </label>
                        </div>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                            {t('cards:contacts.modal.tags')}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {availableTags.map((tag) => (
                                <button
                                    key={tag.id}
                                    onClick={() =>
                                        setSelectedBulkTags((prev) =>
                                            prev.includes(tag.id)
                                                ? prev.filter((i) => i !== tag.id)
                                                : [...prev, tag.id],
                                        )
                                    }
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        border: '1px solid var(--glass-border)',
                                        background: selectedBulkTags.includes(tag.id)
                                            ? tag.color || 'var(--accent-primary)'
                                            : 'var(--glass-bg)',
                                        color: selectedBulkTags.includes(tag.id)
                                            ? 'var(--bg-card)'
                                            : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            onClick={() => setIsBulkTagModalOpen(false)}
                            className="glass-button"
                            style={{ padding: '8px 20px' }}
                        >
                            {t('common:cancel')}
                        </button>
                        <button
                            onClick={onBulkTags}
                            disabled={selectedBulkTags.length === 0}
                            style={{
                                padding: '8px 25px',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                opacity: selectedBulkTags.length === 0 ? 0.5 : 1,
                                cursor: selectedBulkTags.length === 0 ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {t('cards:contacts.btn.apply')}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={isBulkDeleteConfirmOpen}
                onClose={() => setIsBulkDeleteConfirmOpen(false)}
                onConfirm={onBulkDelete}
                title={t('cards:contacts.modal.bulkDeleteTitle')}
                message={t('cards:contacts.modal.bulkDeleteMessage', { count: selectedIds.length })}
            />

            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="bulk-bar"
                    >
                        <div className="bulk-bar-count">
                            <div
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    background: 'var(--accent-primary)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    flexShrink: 0,
                                }}
                            >
                                {selectedIds.length}
                            </div>
                            <span
                                style={{
                                    color: 'var(--text-primary)',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {t('cards:contacts.selectedLabel')}
                            </span>
                        </div>

                        <div className="bulk-bar-actions">
                            <button
                                onClick={() => setIsBulkTagModalOpen(true)}
                                className="glass-button-small"
                                title={t('cards:contacts.bulk.tag')}
                                style={{ color: 'var(--accent-warning)' }}
                            >
                                <FaStar size={12} /> {t('cards:contacts.btn.tag')}
                            </button>
                            <button
                                onClick={() => onBulkVisibility('public')}
                                className="glass-button-small"
                                title={t('cards:contacts.bulk.makePublic')}
                                style={{ color: 'var(--accent-success)' }}
                            >
                                <FaGlobe size={12} />
                            </button>
                            <button
                                onClick={() => onBulkVisibility('private')}
                                className="glass-button-small"
                                title={t('cards:contacts.bulk.makePrivate')}
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                <FaIdCard size={12} />
                            </button>
                            <button
                                onClick={() => onBulkExport('excel')}
                                className="glass-button-small"
                                title={t('cards:contacts.bulk.exportExcel')}
                                style={{ color: '#27ae60' }}
                            >
                                <FaFileExcel size={12} />
                            </button>
                            <button
                                onClick={() => onBulkExport('pdf')}
                                className="glass-button-small"
                                title={t('cards:contacts.bulk.exportPdf')}
                                style={{ color: '#e74c3c' }}
                            >
                                <FaFilePdf size={12} />
                            </button>
                            <button
                                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                                className="glass-button-small"
                                title={t('cards:contacts.bulk.delete')}
                                style={{ background: 'var(--accent-error)', color: 'white', border: 'none' }}
                            >
                                <FaTrash size={12} />
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="glass-button-small"
                                title={t('cards:contacts.bulk.deselect')}
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                ✕
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isVcfExportConfirmOpen}
                onClose={() => setIsVcfExportConfirmOpen(false)}
                onConfirm={onBulkVcfExport}
                title={t('cards:contacts.vcfExport.title')}
                message={t('cards:contacts.vcfExport.message')}
                confirmLabel={t('cards:contacts.titleAttr.downloadVcf')}
                variant="primary"
            />
        </>
    );
};

export default ContactsBulkBar;
