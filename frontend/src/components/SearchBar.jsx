import React from 'react';

const SearchBar = ({
    searchTerm,
    onSearchChange,
    sortOption,
    onSortChange,
    advancedFilters,
    onAdvancedFilterChange,
    allTags = [],
    allCities = []
}) => {
    const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

    const hasActiveAdvancedFilters =
        advancedFilters.tagId !== '' ||
        advancedFilters.city !== '' ||
        advancedFilters.hasReminder === true;

    const clearFilters = () => {
        onSearchChange('');
        onAdvancedFilterChange({
            tagId: '',
            city: '',
            hasReminder: false
        });
    };

    return (
        <div style={{ marginBottom: '25px' }}>
            {/* Main Search Bar */}
            <div style={{
                display: 'flex',
                gap: '15px',
                padding: '18px',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
                    <input
                        type="text"
                        placeholder="Kartvizitlerde ara... (Ad, Şirket, E-posta)"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--bg-input)',
                            backdropFilter: 'blur(5px)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <select
                    value={sortOption}
                    onChange={(e) => onSortChange(e.target.value)}
                    style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--bg-input)',
                        backdropFilter: 'blur(5px)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <option value="newest" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>En Yeni Eklenen</option>
                    <option value="oldest" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>En Eski Eklenen</option>
                    <option value="nameAsc" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>İsim (A-Z)</option>
                    <option value="nameDesc" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>İsim (Z-A)</option>
                    <option value="companyAsc" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Şirket (A-Z)</option>
                </select>

                <button
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        background: isAdvancedOpen ? 'var(--accent-primary)' : 'var(--glass-bg)',
                        border: isAdvancedOpen ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                        color: isAdvancedOpen ? 'white' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    Gelişmiş Filtrele {hasActiveAdvancedFilters && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isAdvancedOpen ? 'white' : 'var(--accent-primary)' }}></span>}
                </button>


                {(searchTerm || hasActiveAdvancedFilters) && (
                    <button
                        onClick={clearFilters}
                        style={{
                            padding: '12px',
                            borderRadius: '12px',
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--accent-error)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                    >
                        Temizle
                    </button>
                )}
            </div>

            {/* Advanced Filters Panel */}
            {isAdvancedOpen && (
                <div style={{
                    marginTop: '10px',
                    padding: '20px',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(15px)',
                    borderRadius: '16px',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    animation: 'fadeInDown 0.3s ease'
                }}>
                    {/* Tag Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>ETİKET</label>
                        <select
                            value={advancedFilters.tagId}
                            onChange={(e) => onAdvancedFilterChange({ ...advancedFilters, tagId: e.target.value })}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        >
                            <option value="" style={{ background: 'var(--bg-card)' }}>Tümü</option>
                            {allTags.map(tag => (
                                <option key={tag.id} value={tag.id} style={{ background: 'var(--bg-card)' }}>{tag.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* City Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>ŞEHİR</label>
                        <select
                            value={advancedFilters.city}
                            onChange={(e) => onAdvancedFilterChange({ ...advancedFilters, city: e.target.value })}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        >
                            <option value="" style={{ background: 'var(--bg-card)' }}>Tümü</option>
                            {allCities.map(city => (
                                <option key={city} value={city} style={{ background: 'var(--bg-card)' }}>{city}</option>
                            ))}
                        </select>
                    </div>

                    {/* Reminder Toggle */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                        }}>
                            <input
                                type="checkbox"
                                checked={advancedFilters.hasReminder}
                                onChange={(e) => onAdvancedFilterChange({ ...advancedFilters, hasReminder: e.target.checked })}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    accentColor: 'var(--accent-primary)'
                                }}
                            />
                            Sadece Hatırlatıcılar
                        </label>
                    </div>
                </div>
            )}

        </div>
    );
};


export default SearchBar;
