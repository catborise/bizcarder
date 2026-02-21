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
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
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
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(5px)',
                            color: 'white',
                            fontSize: '15px',
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
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(5px)',
                        color: 'white',
                        fontSize: '15px',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <option value="newest" style={{ background: '#2a2a2a', color: 'white' }}>En Yeni Eklenen</option>
                    <option value="oldest" style={{ background: '#2a2a2a', color: 'white' }}>En Eski Eklenen</option>
                    <option value="nameAsc" style={{ background: '#2a2a2a', color: 'white' }}>İsim (A-Z)</option>
                    <option value="nameDesc" style={{ background: '#2a2a2a', color: 'white' }}>İsim (Z-A)</option>
                    <option value="companyAsc" style={{ background: '#2a2a2a', color: 'white' }}>Şirket (A-Z)</option>
                </select>

                <button
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        background: isAdvancedOpen ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        border: isAdvancedOpen ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.3)',
                        color: isAdvancedOpen ? '#60a5fa' : 'white',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    Gelişmiş Filtrele {hasActiveAdvancedFilters && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60a5fa' }}></span>}
                </button>

                {(searchTerm || hasActiveAdvancedFilters) && (
                    <button
                        onClick={clearFilters}
                        style={{
                            padding: '12px',
                            borderRadius: '12px',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.6)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#ff6b6b'}
                        onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.6)'}
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
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(15px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    animation: 'fadeInDown 0.3s ease'
                }}>
                    {/* Tag Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>ETİKET</label>
                        <select
                            value={advancedFilters.tagId}
                            onChange={(e) => onAdvancedFilterChange({ ...advancedFilters, tagId: e.target.value })}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                outline: 'none'
                            }}
                        >
                            <option value="">Tümü</option>
                            {allTags.map(tag => (
                                <option key={tag.id} value={tag.id} style={{ background: '#2a2a2a' }}>{tag.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* City Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600' }}>ŞEHİR</label>
                        <select
                            value={advancedFilters.city}
                            onChange={(e) => onAdvancedFilterChange({ ...advancedFilters, city: e.target.value })}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                outline: 'none'
                            }}
                        >
                            <option value="">Tümü</option>
                            {allCities.map(city => (
                                <option key={city} value={city} style={{ background: '#2a2a2a' }}>{city}</option>
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
                            color: 'white',
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
                                    accentColor: '#3b82f6'
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
