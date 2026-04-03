import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaSearch, FaQuestionCircle, FaIdCard, FaQrcode, FaBell,
    FaMobileAlt, FaShieldAlt, FaChevronRight, FaChevronDown,
    FaLightbulb, FaSync, FaTrashAlt, FaDatabase
} from 'react-icons/fa';

const Help = () => {
    const { t } = useTranslation('help');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSection, setActiveSection] = useState('getting-started');
    const [expandedFaq, setExpandedFaq] = useState(null);

    const helpSections = [
        {
            id: 'getting-started',
            title: t('sections.gettingStarted'),
            icon: <FaLightbulb />,
            items: [
                {
                    q: t('faq.whatIsBizcarder.q'),
                    a: t('faq.whatIsBizcarder.a')
                },
                {
                    q: t('faq.howToInstall.q'),
                    a: t('faq.howToInstall.a')
                }
            ]
        },
        {
            id: 'card-management',
            title: t('sections.cardManagement'),
            icon: <FaIdCard />,
            items: [
                {
                    q: t('faq.howToAddCard.q'),
                    a: t('faq.howToAddCard.a')
                },
                {
                    q: t('faq.howToExport.q'),
                    a: t('faq.howToExport.a')
                }
            ]
        },
        {
            id: 'digital-card',
            title: t('sections.digitalCard'),
            icon: <FaQrcode />,
            items: [
                {
                    q: t('faq.howToShare.q'),
                    a: t('faq.howToShare.a')
                },
                {
                    q: t('faq.whatIsVcard.q'),
                    a: t('faq.whatIsVcard.a')
                }
            ]
        },
        {
            id: 'crm-features',
            title: t('sections.crmFeatures'),
            icon: <FaBell />,
            items: [
                {
                    q: t('faq.howReminders.q'),
                    a: t('faq.howReminders.a')
                },
                {
                    q: t('faq.howToLogNotes.q'),
                    a: t('faq.howToLogNotes.a')
                }
            ]
        },
        {
            id: 'offline-mode',
            title: t('sections.offlineMode'),
            icon: <FaSync />,
            items: [
                {
                    q: t('faq.offlineUsage.q'),
                    a: t('faq.offlineUsage.a')
                }
            ]
        },
        {
            id: 'security',
            title: t('sections.security'),
            icon: <FaShieldAlt />,
            items: [
                {
                    q: t('faq.dataSecurity.q'),
                    a: t('faq.dataSecurity.a')
                }
            ]
        },
        {
            id: 'admin-backup',
            title: t('sections.adminBackup'),
            icon: <FaDatabase />,
            items: [
                {
                    q: t('faq.howToBackup.q'),
                    a: t('faq.howToBackup.a')
                },
                {
                    q: t('faq.howToRestore.q'),
                    a: t('faq.howToRestore.a')
                },
                {
                    q: t('faq.howToResetAdmin.q'),
                    a: t('faq.howToResetAdmin.a')
                },
                {
                    q: t('faq.howToEnable2FA.q'),
                    a: t('faq.howToEnable2FA.a')
                }
            ]
        }
    ];

    const filteredSections = searchTerm
        ? helpSections.map(s => ({
            ...s,
            items: s.items.filter(i =>
                i.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.a.toLowerCase().includes(searchTerm.toLowerCase())
            )
        })).filter(s => s.items.length > 0)
        : helpSections;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fade-in"
            style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}
        >
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                <h1 style={{
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    fontWeight: '900',
                    color: 'var(--text-primary)',
                    marginBottom: '20px',
                    letterSpacing: '-0.04em'
                }}>
                    {t('heading')}
                </h1>

                {/* Search Bar */}
                <div style={{
                    maxWidth: '600px',
                    margin: '0 auto',
                    position: 'relative',
                    transform: 'translateY(10px)'
                }}>
                    <FaSearch style={{
                        position: 'absolute',
                        left: '20px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-tertiary)'
                    }} />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '18px 20px 18px 55px',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(15px)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '20px',
                            fontSize: '1.1rem',
                            color: 'var(--text-primary)',
                            boxShadow: 'var(--glass-shadow)',
                            outline: 'none',
                            transition: 'all 0.3s ease'
                        }}
                    />
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(250px, 300px) 1fr',
                gap: '40px',
                alignItems: 'start'
            }}>
                {/* Sidebar Navigation */}
                <aside style={{
                    position: 'sticky',
                    top: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    {helpSections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                padding: '15px 20px',
                                background: activeSection === section.id ? 'var(--accent-primary)' : 'var(--glass-bg)',
                                color: activeSection === section.id ? '#fff' : 'var(--text-primary)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '15px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                textAlign: 'left',
                                boxShadow: activeSection === section.id ? '0 8px 20px rgba(var(--accent-primary-rgb), 0.3)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>{section.icon}</span>
                            {section.title}
                            {activeSection === section.id && <FaChevronRight style={{ marginLeft: 'auto' }} />}
                        </button>
                    ))}
                </aside>

                {/* Content Area */}
                <main style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    padding: '40px',
                    minHeight: '600px',
                    boxShadow: 'var(--glass-shadow)'
                }}>
                    <AnimatePresence mode="wait">
                        {filteredSections.map(section => (
                            activeSection === section.id || searchTerm ? (
                                <motion.div
                                    key={section.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                                        <div style={{
                                            padding: '12px',
                                            background: 'rgba(var(--accent-primary-rgb), 0.1)',
                                            borderRadius: '12px',
                                            color: 'var(--accent-primary)',
                                            fontSize: '1.5rem'
                                        }}>
                                            {section.icon}
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)' }}>{section.title}</h2>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {section.items.map((item, idx) => {
                                            const itemKey = `${section.id}-${idx}`;
                                            const isExpanded = expandedFaq === itemKey;

                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        background: 'rgba(var(--bg-card-rgb), 0.3)',
                                                        border: '1px solid var(--glass-border)',
                                                        borderRadius: '15px',
                                                        overflow: 'hidden',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => setExpandedFaq(isExpanded ? null : itemKey)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '20px',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '1.1rem',
                                                            fontWeight: '600',
                                                            textAlign: 'left',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {item.q}
                                                        {isExpanded ? <FaChevronDown color="var(--accent-primary)" /> : <FaChevronRight color="var(--text-tertiary)" />}
                                                    </button>

                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.3 }}
                                                            >
                                                                <div style={{
                                                                    padding: '0 20px 20px 20px',
                                                                    color: 'var(--text-secondary)',
                                                                    lineHeight: '1.7',
                                                                    fontSize: '1rem'
                                                                }}>
                                                                    <div style={{
                                                                        padding: '20px',
                                                                        background: 'var(--bg-input)',
                                                                        borderRadius: '12px',
                                                                        borderLeft: '4px solid var(--accent-primary)'
                                                                    }}>
                                                                        {item.a}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ) : null
                        ))}
                    </AnimatePresence>

                    {filteredSections.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}>
                            <FaQuestionCircle size={64} style={{ marginBottom: '20px' }} />
                            <h3>{t('notFound')}</h3>
                            <p>{t('notFoundHint')}</p>
                        </div>
                    )}
                </main>
            </div>

            {/* Quick Contact Footer */}
            <div style={{
                marginTop: '60px',
                padding: '40px',
                background: 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.1), rgba(var(--accent-secondary-rgb), 0.1))',
                borderRadius: '24px',
                border: '1px solid var(--glass-border)',
                textAlign: 'center'
            }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>{t('contactTitle')}</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>{t('contactDescription')}</p>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <a href="mailto:destek@bizcarder.com" style={{
                        padding: '12px 25px',
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        boxShadow: '0 8px 20px rgba(var(--accent-primary-rgb), 0.2)'
                    }}>{t('sendEmail')}</a>
                    <a href="/about" style={{
                        padding: '12px 25px',
                        background: 'var(--glass-bg)',
                        color: 'var(--text-primary)',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        border: '1px solid var(--glass-border)',
                        fontWeight: '600'
                    }}>{t('devTeam')}</a>
                </div>
            </div>
        </motion.div>
    );
};

export default Help;
