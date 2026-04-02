import { FaCog, FaArrowUp, FaArrowDown, FaUndo } from 'react-icons/fa';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function WidgetCustomizer({ widgets, onToggle, onMove, onReset }) {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation('dashboard');

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="glass-button-square"
                title={t('customizeWidgets', 'Customize Dashboard')}
                style={{ width: '36px', height: '36px' }}
            >
                <FaCog size={16} />
            </button>

            {isOpen && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setIsOpen(false)} />
                    <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: '8px',
                        background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                        borderRadius: '12px', padding: 'var(--space-4)', minWidth: '260px',
                        boxShadow: 'var(--glass-shadow)', zIndex: 999, animation: 'fadeIn 0.2s ease',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{t('widgetSettings', 'Widget Settings')}</h4>
                            <button onClick={onReset} className="glass-button-small" style={{ fontSize: '0.7rem', gap: '4px' }}>
                                <FaUndo size={10} /> {t('reset', 'Reset')}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {widgets.map((widget, idx) => (
                                <div key={widget.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                                    padding: '6px 8px', borderRadius: '8px',
                                    background: widget.visible ? 'rgba(var(--accent-secondary-rgb), 0.05)' : 'transparent',
                                }}>
                                    <label className="switch" style={{ transform: 'scale(0.7)', flexShrink: 0 }}>
                                        <input type="checkbox" checked={widget.visible} onChange={() => onToggle(widget.id)} />
                                        <span className="slider"></span>
                                    </label>
                                    <span style={{ flex: 1, fontSize: '0.8rem', color: widget.visible ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                        {widget.label}
                                    </span>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <button
                                            onClick={() => onMove(widget.id, 'up')}
                                            disabled={idx === 0}
                                            style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: '2px', color: 'var(--text-tertiary)', opacity: idx === 0 ? 0.3 : 1 }}
                                        >
                                            <FaArrowUp size={10} />
                                        </button>
                                        <button
                                            onClick={() => onMove(widget.id, 'down')}
                                            disabled={idx === widgets.length - 1}
                                            style={{ background: 'none', border: 'none', cursor: idx === widgets.length - 1 ? 'default' : 'pointer', padding: '2px', color: 'var(--text-tertiary)', opacity: idx === widgets.length - 1 ? 0.3 : 1 }}
                                        >
                                            <FaArrowDown size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
