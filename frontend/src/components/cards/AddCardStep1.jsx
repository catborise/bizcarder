const focusHandlers = {
    onFocus: (e) => {
        e.target.style.background = 'var(--glass-bg-hover)';
        e.target.style.borderColor = 'var(--accent-primary)';
    },
    onBlur: (e) => {
        e.target.style.background = 'var(--bg-card)';
        e.target.style.borderColor = 'var(--glass-border)';
    },
};

const AddCardStep1 = ({
    t,
    formData,
    setFormData,
    handleInputChange,
    showMoreFields,
    setShowMoreFields,
    showNotification,
    inputStyle,
}) => {
    return (
        <>
            {/* Native Contact Picker Integration */}
            {'contacts' in navigator && 'ContactsManager' in window && (
                <button
                    type="button"
                    onClick={async () => {
                        try {
                            const props = ['name', 'email', 'tel'];
                            const opts = { multiple: false };
                            const contacts = await navigator.contacts.select(props, opts);
                            if (contacts.length > 0) {
                                const contact = contacts[0];
                                const names = contact.name[0]?.split(' ') || [];
                                setFormData((prev) => ({
                                    ...prev,
                                    firstName: names.slice(0, -1).join(' ') || contact.name[0] || '',
                                    lastName: names[names.length - 1] || '',
                                    email: contact.email[0] || '',
                                    phone: contact.tel[0] || '',
                                }));
                                showNotification(t('addCard.notify.contactImported'), 'success');
                            }
                        } catch (err) {
                            console.error('Contact Picker Error:', err);
                        }
                    }}
                    style={{
                        padding: '10px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '12px',
                        color: '#60a5fa',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    {t('addCard.btn.importFromContacts')}
                </button>
            )}

            {/* Temel Bilgiler */}
            <div className="addcard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                    type="text"
                    name="firstName"
                    placeholder={t('addCard.placeholder.firstName')}
                    value={formData.firstName}
                    onChange={handleInputChange}
                    style={inputStyle}
                    {...focusHandlers}
                    required
                />
                <input
                    type="text"
                    name="lastName"
                    placeholder={t('addCard.placeholder.lastName')}
                    value={formData.lastName}
                    onChange={handleInputChange}
                    style={inputStyle}
                    {...focusHandlers}
                    required
                />
            </div>

            <div className="addcard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                    type="text"
                    name="company"
                    placeholder={t('addCard.placeholder.company')}
                    value={formData.company}
                    onChange={handleInputChange}
                    style={inputStyle}
                    {...focusHandlers}
                />
                <input
                    type="text"
                    name="title"
                    placeholder={t('addCard.placeholder.title')}
                    value={formData.title}
                    onChange={handleInputChange}
                    style={inputStyle}
                    {...focusHandlers}
                />
            </div>

            {/* İletişim Bilgileri */}
            <div className="addcard-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                    type="email"
                    name="email"
                    placeholder={t('addCard.placeholder.email')}
                    value={formData.email}
                    onChange={handleInputChange}
                    style={inputStyle}
                    {...focusHandlers}
                />
                <input
                    type="text"
                    name="phone"
                    placeholder={t('addCard.placeholder.phone')}
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={inputStyle}
                    {...focusHandlers}
                />
            </div>
            <p
                style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    margin: '-10px 0 0 0',
                    fontStyle: 'italic',
                }}
            >
                {t('addCard.hint.contactRequired')}
            </p>

            {/* Toggle for secondary fields */}
            <button
                type="button"
                onClick={() => setShowMoreFields(!showMoreFields)}
                className="glass-button"
                style={{
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: 'var(--space-2)',
                    marginBottom: 'var(--space-2)',
                    fontSize: '0.85rem',
                }}
            >
                {showMoreFields ? t('cards:addCard.showLess') : t('cards:addCard.showMore')}
                <span
                    style={{
                        marginLeft: '6px',
                        transition: 'transform 0.2s',
                        transform: showMoreFields ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                >
                    ▼
                </span>
            </button>

            {showMoreFields && (
                <div
                    className="addcard-form-grid"
                    style={{
                        animation: 'fadeIn 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}
                >
                    <input
                        type="text"
                        name="website"
                        placeholder={t('addCard.placeholder.website')}
                        value={formData.website}
                        onChange={handleInputChange}
                        style={inputStyle}
                        {...focusHandlers}
                    />

                    {/* Adres Bilgileri Grubu */}
                    <fieldset
                        style={{
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            padding: '15px',
                            margin: 0,
                            background: 'var(--glass-bg)',
                        }}
                    >
                        <legend
                            style={{
                                padding: '0 8px',
                                color: 'var(--text-secondary)',
                                fontSize: '0.95em',
                                fontWeight: '500',
                            }}
                        >
                            {t('addCard.label.addressInfo')}
                        </legend>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <textarea
                                name="address"
                                rows="2"
                                placeholder={t('addCard.placeholder.address')}
                                value={formData.address}
                                onChange={handleInputChange}
                                style={{
                                    ...inputStyle,
                                    width: '100%',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                    resize: 'vertical',
                                }}
                                {...focusHandlers}
                            />
                            <div
                                className="addcard-form-grid"
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                            >
                                <input
                                    type="text"
                                    name="city"
                                    placeholder={t('addCard.placeholder.city')}
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    {...focusHandlers}
                                />
                                <input
                                    type="text"
                                    name="country"
                                    placeholder={t('addCard.placeholder.country')}
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    style={inputStyle}
                                    {...focusHandlers}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Notlar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {t('addCard.label.notes')}
                        </label>
                        <textarea
                            name="notes"
                            rows="3"
                            placeholder={t('addCard.placeholder.notes')}
                            value={formData.notes}
                            onChange={handleInputChange}
                            style={{
                                ...inputStyle,
                                width: '100%',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box',
                                resize: 'vertical',
                            }}
                            {...focusHandlers}
                        />
                    </div>

                    {/* OCR Metni */}
                    {formData.ocrText && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                {t('cards:addCard.label.ocrText')}
                            </label>
                            <textarea
                                name="ocrText"
                                rows="3"
                                placeholder={t('cards:addCard.placeholder.ocrText')}
                                value={formData.ocrText}
                                onChange={handleInputChange}
                                style={{
                                    ...inputStyle,
                                    width: '100%',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                    resize: 'vertical',
                                    fontSize: '12px',
                                }}
                                {...focusHandlers}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default AddCardStep1;
