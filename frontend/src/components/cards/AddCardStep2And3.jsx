import { Fragment } from 'react';
import { FaStar } from 'react-icons/fa';
import api from '../../api/axios';

export const AddCardStepper = ({ t, currentStep }) => {
    const steps = [
        { num: 1, label: t('addCard.step.basic') },
        { num: 2, label: t('addCard.step.detail') },
        { num: 3, label: t('addCard.step.lead') },
    ];

    return (
        <div
            className="addcard-steps"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                padding: '20px 0',
                marginBottom: '10px',
            }}
        >
            {steps.map((step, index) => (
                <Fragment key={step.num}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                            className="step-circle"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: currentStep >= step.num ? 'var(--accent-primary)' : 'var(--glass-bg)',
                                border:
                                    currentStep >= step.num
                                        ? '2px solid var(--accent-primary)'
                                        : '2px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: currentStep >= step.num ? 'var(--bg-card)' : 'var(--text-secondary)',
                                fontWeight: '700',
                                fontSize: '14px',
                            }}
                        >
                            {step.num}
                        </div>
                        <span
                            className="step-label"
                            style={{
                                color: currentStep >= step.num ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '14px',
                            }}
                        >
                            {step.label}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div
                            className="step-line"
                            style={{
                                width: '40px',
                                height: '2px',
                                background:
                                    currentStep >= step.num + 1 ? 'var(--accent-primary)' : 'var(--glass-border)',
                            }}
                        />
                    )}
                </Fragment>
            ))}
        </div>
    );
};

const AddCardStep2And3 = ({
    t,
    currentStep,
    formData,
    setFormData,
    handleInputChange,
    availableTags,
    setAvailableTags,
    tagsLoading,
    showNotification,
    inputStyle,
}) => {
    if (currentStep === 2) {
        return (
            <>
                <div
                    className="addcard-form-grid"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {t('addCard.label.tags')}
                        </label>
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                                padding: '10px',
                                background: 'var(--bg-input)',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                            }}
                        >
                            {tagsLoading ? (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                                    {t('addCard.label.tagsLoading')}
                                </span>
                            ) : (
                                <>
                                    {availableTags &&
                                        availableTags.length > 0 &&
                                        availableTags.map((tag) => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => {
                                                    const newTags = formData.tags.includes(tag.id)
                                                        ? formData.tags.filter((id) => id !== tag.id)
                                                        : [...formData.tags, tag.id];
                                                    setFormData((prev) => ({ ...prev, tags: newTags }));
                                                }}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    border: '1px solid',
                                                    borderColor: formData.tags.includes(tag.id)
                                                        ? tag.color
                                                        : 'var(--glass-border)',
                                                    background: formData.tags.includes(tag.id)
                                                        ? tag.color
                                                        : 'transparent',
                                                    color: formData.tags.includes(tag.id)
                                                        ? 'white'
                                                        : 'var(--text-secondary)',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {tag.name}
                                            </button>
                                        ))}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                showNewTagInput: !prev.showNewTagInput,
                                            }))
                                        }
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            border: '1px dashed var(--accent-primary)',
                                            background: 'transparent',
                                            color: 'var(--accent-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        {formData.showNewTagInput ? '×' : t('addCard.btn.newTag')}
                                    </button>
                                    {formData.showNewTagInput && (
                                        <div style={{ display: 'flex', gap: '5px', width: '100%', marginTop: '5px' }}>
                                            <input
                                                type="text"
                                                placeholder={t('addCard.placeholder.tagName')}
                                                value={formData.newTagName}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        newTagName: e.target.value,
                                                    }))
                                                }
                                                style={{
                                                    ...inputStyle,
                                                    flex: 1,
                                                    padding: '5px 10px',
                                                    height: '32px',
                                                    fontSize: '12px',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!formData.newTagName.trim()) return;
                                                    try {
                                                        const res = await api.post('/api/tags', {
                                                            name: formData.newTagName,
                                                            color:
                                                                '#' +
                                                                Math.floor(Math.random() * 16777215)
                                                                    .toString(16)
                                                                    .padStart(6, '0'),
                                                        });
                                                        setAvailableTags((prev) => [...prev, res.data]);
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            tags: [...prev.tags, res.data.id],
                                                            newTagName: '',
                                                            showNewTagInput: false,
                                                        }));
                                                        showNotification(t('addCard.notify.tagCreated'), 'success');
                                                    } catch {
                                                        showNotification(t('addCard.notify.tagCreateFailed'), 'error');
                                                    }
                                                }}
                                                style={{
                                                    padding: '0 10px',
                                                    background: 'var(--accent-primary)',
                                                    color: 'var(--bg-card)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {t('common:add')}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {t('addCard.label.reminder')}
                        </label>
                        <input
                            type="date"
                            name="reminderDate"
                            value={formData.reminderDate}
                            onChange={handleInputChange}
                            style={inputStyle}
                        />
                    </div>
                </div>

                <select
                    name="visibility"
                    value={formData.visibility}
                    onChange={handleInputChange}
                    style={{ ...inputStyle, width: '100%', cursor: 'pointer', fontWeight: '500' }}
                >
                    <option value="private" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                        {t('addCard.visibility.private')}
                    </option>
                    <option value="public" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                        {t('addCard.visibility.public')}
                    </option>
                </select>
            </>
        );
    }

    if (currentStep === 3) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                    className="addcard-form-grid"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {t('addCard.label.leadStatus')}
                        </label>
                        <select
                            name="leadStatus"
                            value={formData.leadStatus}
                            onChange={handleInputChange}
                            style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                        >
                            <option value="Cold">{t('common:leadStatus.Cold')}</option>
                            <option value="Warm">{t('common:leadStatus.Warm')}</option>
                            <option value="Hot">{t('common:leadStatus.Hot')}</option>
                            <option value="Following-up">{t('common:leadStatus.Following-up')}</option>
                            <option value="Converted">{t('common:leadStatus.Converted')}</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {t('addCard.label.priority')}
                        </label>
                        <div
                            style={{
                                display: 'flex',
                                gap: '10px',
                                height: '45px',
                                alignItems: 'center',
                                background: 'var(--bg-card)',
                                borderRadius: '10px',
                                padding: '0 15px',
                                border: '1px solid var(--glass-border)',
                            }}
                        >
                            {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                    key={star}
                                    size={20}
                                    color={formData.priority >= star ? 'var(--accent-warning)' : 'var(--text-tertiary)'}
                                    style={{
                                        cursor: 'pointer',
                                        opacity: formData.priority >= star ? 1 : 0.3,
                                    }}
                                    onClick={() => setFormData((prev) => ({ ...prev, priority: star }))}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {t('addCard.label.source')}
                    </label>
                    <input
                        type="text"
                        name="source"
                        placeholder={t('addCard.placeholder.source')}
                        value={formData.source}
                        onChange={handleInputChange}
                        style={inputStyle}
                    />
                </div>
            </div>
        );
    }

    return null;
};

export default AddCardStep2And3;
