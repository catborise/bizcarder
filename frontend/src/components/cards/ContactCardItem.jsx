import { motion } from 'framer-motion';
import {
    FaIdCard,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaCity,
    FaGlobe,
    FaStickyNote,
    FaChevronDown,
    FaChevronUp,
    FaTrash,
    FaClock,
    FaDownload,
    FaCalendarCheck,
    FaQrcode,
    FaStar,
    FaWhatsapp,
} from 'react-icons/fa';
import { API_URL } from '../../api/axios';
import InteractionLog from './InteractionLog';

const isLightColor = (color) => {
    if (!color || color.length < 7) return true;
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 155;
};

const ContactCardItem = ({
    card,
    index,
    t,
    i18n,
    navigate,
    isSelected,
    isExpanded,
    getStatusStyle,
    onSelectCard,
    onSelectImage,
    onToggleDetails,
    onWhatsAppFollowUp,
    onEmailFollowUp,
    onOpenQr,
    onDownloadVCard,
    onOpenHistory,
    onEdit,
    onDeleteClick,
}) => {
    const hasImage = !!card.frontImageUrl;
    const statusStyle = card.leadStatus ? getStatusStyle(card.leadStatus) : null;

    return (
        <motion.div
            className="card-wrapper"
            data-priority={card.priority || ''}
            data-lead={card.leadStatus || ''}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                delay: index * 0.04,
                ease: 'easeOut',
            }}
        >
            <div
                className="glass-container"
                style={{
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    backgroundColor: isSelected ? 'var(--accent-primary-transparent)' : 'var(--glass-bg)',
                    padding: '20px',
                }}
            >
                <div className="contact-card">
                    {/* Row Checkbox */}
                    <div className="checkbox-container">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelectCard(card.id)}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: 'var(--accent-primary)',
                            }}
                        />
                    </div>

                    {/* Image + Status Badges Column */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            className="card-image-container"
                            onClick={hasImage ? () => onSelectImage(card) : undefined}
                        >
                            {hasImage ? (
                                <img
                                    src={`${API_URL}${card.frontImageUrl}`}
                                    alt={card.firstName}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                    }}
                                />
                            ) : (
                                <FaIdCard size={64} style={{ opacity: 0.5 }} />
                            )}
                            {card.priority > 0 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '6px',
                                        left: '8px',
                                        display: 'flex',
                                        gap: '1px',
                                    }}
                                >
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <FaStar
                                            key={star}
                                            size={10}
                                            color={
                                                card.priority >= star
                                                    ? 'var(--accent-warning)'
                                                    : 'rgba(128,128,128,0.4)'
                                            }
                                            style={
                                                hasImage
                                                    ? { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '6px',
                                    left: '8px',
                                    right: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span
                                    style={{
                                        color: 'var(--text-tertiary)',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        opacity: hasImage ? 0.8 : 0.5,
                                        ...(hasImage && { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }),
                                    }}
                                >
                                    v{card.version || 1}
                                </span>
                                {statusStyle && (
                                    <span
                                        style={{
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            fontSize: '9px',
                                            fontWeight: 'bold',
                                            lineHeight: 1.2,
                                            background: statusStyle.bg,
                                            color: statusStyle.color,
                                            border: `1px solid ${statusStyle.color}33`,
                                            ...(hasImage && { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }),
                                        }}
                                    >
                                        {statusStyle.icon} {statusStyle.label}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Tags — below the image */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {card.tags && card.tags.length > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '4px',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {card.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/contacts?tagId=${tag.id}`);
                                            }}
                                            style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                fontWeight: '700',
                                                background: tag.color || 'var(--accent-primary)',
                                                color: isLightColor(tag.color) ? '#000' : '#fff',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card-info">
                        <h3>
                            {card.firstName} {card.lastName}
                        </h3>
                        <p className="company-line">
                            {card.logoUrl && (
                                <img
                                    src={`${API_URL}${card.logoUrl}`}
                                    alt={card.company ? `${card.company} logo` : 'Company logo'}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        objectFit: 'contain',
                                        borderRadius: '4px',
                                        background: 'var(--bg-card)',
                                        padding: '2px',
                                        border: '1px solid var(--glass-border)',
                                    }}
                                />
                            )}
                            {card.company} {card.title && `- ${card.title}`}
                        </p>

                        {card.lastInteraction && (
                            <div
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-tertiary)',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                <FaClock size={10} />
                                {t('cards:contacts.lastInteraction')}: {card.lastInteraction.type} —{' '}
                                {new Date(card.lastInteraction.date).toLocaleDateString()}
                            </div>
                        )}

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: '8px',
                                fontSize: '0.9em',
                            }}
                        >
                            {card.reminderDate && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 10px',
                                        background: 'var(--glass-bg)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--accent-warning)',
                                        marginBottom: '5px',
                                    }}
                                >
                                    <FaCalendarCheck color="var(--accent-warning)" />
                                    <strong style={{ color: 'var(--text-primary)' }}>
                                        {t('cards:contacts.field.reminder')}
                                    </strong>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {(() => {
                                            const d = new Date(card.reminderDate);
                                            return isNaN(d.getTime())
                                                ? t('cards:contacts.field.noDate')
                                                : d.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US');
                                        })()}
                                    </span>
                                </div>
                            )}
                            {card.lastInteractionDate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaClock color="var(--accent-primary)" size={12} />
                                    <strong style={{ color: 'var(--text-tertiary)' }}>
                                        {t('cards:contacts.field.lastInteraction')}
                                    </strong>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {new Date(card.lastInteractionDate).toLocaleDateString(
                                            i18n.language === 'tr' ? 'tr-TR' : 'en-US',
                                        )}
                                    </span>
                                </div>
                            )}
                            {card.email && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaEnvelope color="var(--accent-warning)" />{' '}
                                    <strong style={{ color: 'var(--text-tertiary)' }}>
                                        {t('cards:contacts.field.email')}
                                    </strong>{' '}
                                    <span style={{ color: 'var(--text-secondary)' }}>{card.email}</span>
                                </div>
                            )}
                            {card.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaPhone color="var(--accent-success)" />{' '}
                                    <strong style={{ color: 'var(--text-tertiary)' }}>
                                        {t('cards:contacts.field.phone')}
                                    </strong>{' '}
                                    <span style={{ color: 'var(--text-secondary)' }}>{card.phone}</span>
                                </div>
                            )}
                            {card.website && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaGlobe color="var(--accent-primary)" />{' '}
                                    <strong style={{ color: 'var(--text-tertiary)' }}>
                                        {t('cards:contacts.field.web')}
                                    </strong>{' '}
                                    <a
                                        href={
                                            card.website.startsWith('http') ? card.website : `https://${card.website}`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: 'var(--accent-secondary)' }}
                                    >
                                        {card.website}
                                    </a>
                                </div>
                            )}
                            {(card.city || card.country) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaCity color="var(--accent-error)" />{' '}
                                    <strong style={{ color: 'var(--text-tertiary)' }}>
                                        {t('cards:contacts.field.location')}
                                    </strong>{' '}
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {card.city}
                                        {card.city && card.country && ', '}
                                        {card.country}
                                    </span>
                                </div>
                            )}
                            {card.address && (
                                <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                                    <FaMapMarkerAlt color="var(--accent-error)" style={{ marginTop: '3px' }} />
                                    <strong style={{ color: 'var(--text-tertiary)' }}>
                                        {t('cards:contacts.field.address')}
                                    </strong>{' '}
                                    <span style={{ color: 'var(--text-secondary)' }}>{card.address}</span>
                                </div>
                            )}
                            {card.source && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaIdCard color="var(--accent-primary)" size={12} />{' '}
                                    <strong style={{ color: 'var(--text-tertiary)' }}>
                                        {t('cards:contacts.field.source')}
                                    </strong>{' '}
                                    <span style={{ color: 'var(--text-secondary)' }}>{card.source}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card-actions">
                        <button
                            onClick={() => onToggleDetails(card.id)}
                            className="glass-button-block"
                            style={{
                                color: 'var(--accent-warning)',
                                padding: '10px 12px',
                                fontSize: '0.9rem',
                                border: '1px solid var(--accent-warning)',
                                background: isExpanded ? 'var(--glass-bg-hover)' : 'transparent',
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaStickyNote /> {t('cards:contacts.btn.activityNotes')}
                            </span>
                            {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                        </button>

                        {/* Hızlı Takip Butonları */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {card.phone && (
                                <button
                                    onClick={() => onWhatsAppFollowUp(card)}
                                    className="glass-button-square"
                                    title={t('cards:contacts.titleAttr.whatsappFollow')}
                                    style={{
                                        color: '#25D366',
                                        borderColor: 'rgba(37, 211, 102, 0.3)',
                                    }}
                                >
                                    <FaWhatsapp size={20} />
                                </button>
                            )}
                            {card.email && (
                                <button
                                    onClick={() => onEmailFollowUp(card)}
                                    className="glass-button-square"
                                    title={t('cards:contacts.titleAttr.emailFollow')}
                                    style={{
                                        color: 'var(--accent-warning)',
                                        borderColor: 'rgba(255, 193, 7, 0.3)',
                                    }}
                                >
                                    <FaEnvelope size={18} />
                                </button>
                            )}
                        </div>

                        <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => onOpenQr(card)}
                                className="glass-button-square"
                                title={t('cards:contacts.titleAttr.qrVcard')}
                                aria-label={t('cards:contacts.titleAttr.qrVcard')}
                            >
                                <FaQrcode size={18} />
                            </button>
                            <button
                                onClick={() => onDownloadVCard(card)}
                                className="glass-button-square"
                                title={t('cards:contacts.titleAttr.downloadVcard')}
                                aria-label={t('cards:contacts.titleAttr.downloadVcard')}
                            >
                                <FaDownload size={18} />
                            </button>
                            <button
                                onClick={() => onOpenHistory(card)}
                                className="glass-button-square"
                                title={t('cards:contacts.titleAttr.history')}
                                aria-label={t('cards:contacts.titleAttr.history')}
                            >
                                <FaClock size={16} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => onEdit(card)} className="glass-button-small" style={{ flex: 1 }}>
                                {t('cards:contacts.btn.edit')}
                            </button>
                            <button
                                onClick={() => onDeleteClick(card)}
                                className="glass-button-small"
                                aria-label={t('cards:contacts.modal.deleteTitle', {
                                    firstName: card.firstName,
                                    lastName: card.lastName,
                                })}
                                style={{ color: 'var(--accent-error)', width: '40px' }}
                            >
                                <FaTrash size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div
                        style={{
                            marginTop: '15px',
                            padding: '20px',
                            background: 'var(--bg-input)',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)',
                        }}
                    >
                        <InteractionLog cardId={card.id} />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ContactCardItem;
