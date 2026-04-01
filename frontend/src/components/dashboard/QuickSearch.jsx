import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icons from 'react-icons/fa';
import api, { API_URL as BASE_API_URL } from '../../api/axios';

const QuickSearch = ({ isAuthenticated }) => {
    const { t } = useTranslation('dashboard');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);
    const navigate = useNavigate();

    const search = useCallback(async (term) => {
        if (!term || term.length < 2) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await api.get('/api/cards', { params: { search: term, limit: 6 } });
            setResults(res.data?.cards || res.data || []);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 400);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.trim()) {
            navigate(`/contacts?search=${encodeURIComponent(query.trim())}`);
            setIsFocused(false);
        }
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!isAuthenticated) return null;

    const showDropdown = isFocused && (results.length > 0 || isSearching || query.length >= 2);

    return (
        <div ref={containerRef} style={{ position: 'relative', marginBottom: '30px' }}>
            <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
            }}>
                <div style={{
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <Icons.FaSearch style={{
                        position: 'absolute',
                        left: '16px',
                        color: isFocused ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                        transition: 'color 0.2s',
                        fontSize: '16px',
                        pointerEvents: 'none'
                    }} />
                    <input
                        type="text"
                        placeholder={t('search.placeholder')}
                        value={query}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        style={{
                            width: '100%',
                            padding: '14px 16px 14px 44px',
                            borderRadius: '14px',
                            border: isFocused ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(10px)',
                            color: 'var(--text-primary)',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxShadow: isFocused ? '0 0 0 3px rgba(var(--accent-primary-rgb), 0.15)' : 'var(--glass-shadow)'
                        }}
                    />
                    {isSearching && (
                        <div className="spinner" style={{
                            position: 'absolute',
                            right: '14px',
                            width: '18px',
                            height: '18px',
                            border: '2px solid var(--glass-border)',
                            borderTopColor: 'var(--accent-primary)',
                            borderRadius: '50%',
                            animation: 'spin 0.6s linear infinite'
                        }} />
                    )}
                </div>
                <button
                    onClick={() => navigate('/contacts')}
                    style={{
                        padding: '14px',
                        borderRadius: '14px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(10px)',
                        flexShrink: 0
                    }}
                    title={t('search.allContacts')}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-bg-hover)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                >
                    <Icons.FaAddressBook size={18} />
                </button>
            </div>

            {/* Dropdown Results */}
            {showDropdown && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '6px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '14px',
                    boxShadow: 'var(--glass-shadow-hover)',
                    zIndex: 50,
                    overflow: 'hidden',
                    backdropFilter: 'blur(20px)'
                }}>
                    {isSearching && results.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                            {t('search.searching')}
                        </div>
                    ) : results.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                            {t('search.noResults')}
                        </div>
                    ) : (
                        <>
                            {results.map((card) => (
                                <div
                                    key={card.id}
                                    onClick={() => {
                                        navigate(`/contacts?search=${encodeURIComponent(card.firstName + ' ' + card.lastName)}`);
                                        setIsFocused(false);
                                        setQuery('');
                                        setResults([]);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                        borderBottom: '1px solid var(--glass-border)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Avatar / Logo */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        overflow: 'hidden'
                                    }}>
                                        {card.logoUrl ? (
                                            <img src={`${BASE_API_URL}${card.logoUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Icons.FaUser size={16} style={{ color: 'var(--text-tertiary)' }} />
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            color: 'var(--text-primary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {card.firstName} {card.lastName}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--text-tertiary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {[card.title, card.company].filter(Boolean).join(' - ') || card.email || card.phone || ''}
                                        </div>
                                    </div>
                                    {/* Lead status badge */}
                                    {card.leadStatus && card.leadStatus !== 'Cold' && (
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            flexShrink: 0,
                                            background: card.leadStatus === 'Hot' ? 'rgba(239,68,68,0.15)' :
                                                card.leadStatus === 'Warm' ? 'rgba(245,158,11,0.15)' :
                                                card.leadStatus === 'Converted' ? 'rgba(16,185,129,0.15)' :
                                                'rgba(59,130,246,0.15)',
                                            color: card.leadStatus === 'Hot' ? 'var(--accent-error)' :
                                                card.leadStatus === 'Warm' ? 'var(--accent-warning)' :
                                                card.leadStatus === 'Converted' ? 'var(--accent-success)' :
                                                'var(--accent-primary)'
                                        }}>
                                            {card.leadStatus}
                                        </span>
                                    )}
                                    <Icons.FaChevronRight size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                </div>
                            ))}
                            {results.length >= 6 && (
                                <div
                                    onClick={() => {
                                        navigate(`/contacts?search=${encodeURIComponent(query)}`);
                                        setIsFocused(false);
                                    }}
                                    style={{
                                        padding: '12px',
                                        textAlign: 'center',
                                        color: 'var(--accent-primary)',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {t('search.viewAll')}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuickSearch;
