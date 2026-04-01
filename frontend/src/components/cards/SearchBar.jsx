import React from 'react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation(['filters', 'common']);
    const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

    const hasActiveAdvancedFilters =
        advancedFilters.tagId !== '' ||
        advancedFilters.city !== '' ||
        advancedFilters.hasReminder === true ||
        advancedFilters.leadStatus !== '' ||
        advancedFilters.source !== '' ||
        advancedFilters.dateStart !== '' ||
        advancedFilters.dateEnd !== '';

    const clearFilters = () => {
        onSearchChange('');
        onAdvancedFilterChange({
            tagId: '',
            city: '',
            hasReminder: false,
            leadStatus: '',
            source: '',
            dateStart: '',
            dateEnd: ''
        });
    };

    return (
        <div style={{ marginBottom: '25px' }}>
            {/* Main Search Bar */}
            <div className="search-bar-container" style={{
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
                        placeholder={t('filters:searchPlaceholder')}
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
                    <option value="newest" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t('filters:sort.newest')}</option>
                    <option value="oldest" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t('filters:sort.oldest')}</option>
                    <option value="nameAsc" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t('filters:sort.nameAsc')}</option>
                    <option value="nameDesc" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t('filters:sort.nameDesc')}</option>
                    <option value="companyAsc" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t('filters:sort.companyAsc')}</option>
                    <option value="priorityDesc" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t('filters:sort.priorityDesc')}</option>
                    <option value="lastInteraction" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t('filters:sort.lastInteraction')}</option>
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
                    {t('filters:advancedFilter')} {hasActiveAdvancedFilters && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isAdvancedOpen ? 'white' : 'var(--accent-primary)' }}></span>}
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
                        {t('filters:clear')}
                    </button>
                )}
            </div>

            {/* Advanced Filters Panel */}
            {isAdvancedOpen && (
                <div className="advanced-filters-panel" style={{
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
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('filters:filterLabel.tag')}</label>
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
                            <option value="" style={{ background: 'var(--bg-card)' }}>{t('common:all')}</option>
                            {allTags.map(tag => (
                                <option key={tag.id} value={tag.id} style={{ background: 'var(--bg-card)' }}>{tag.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* City Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('filters:filterLabel.city')}</label>
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
                            <option value="" style={{ background: 'var(--bg-card)' }}>{t('common:all')}</option>
                            {allCities.map(city => (
                                <option key={city} value={city} style={{ background: 'var(--bg-card)' }}>{city}</option>
                            ))}
                        </select>
                    </div>

                    {/* Lead Status Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('filters:filterLabel.leadStatus')}</label>
                        <select
                            value={advancedFilters.leadStatus}
                            onChange={(e) => onAdvancedFilterChange({ ...advancedFilters, leadStatus: e.target.value })}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        >
                            <option value="" style={{ background: 'var(--bg-card)' }}>{t('common:all')}</option>
                            <option value="Cold" style={{ background: 'var(--bg-card)' }}>{t('common:leadStatus.Cold')}</option>
                            <option value="Warm" style={{ background: 'var(--bg-card)' }}>{t('common:leadStatus.Warm')}</option>
                            <option value="Hot" style={{ background: 'var(--bg-card)' }}>{t('common:leadStatus.Hot')}</option>
                            <option value="Following-up" style={{ background: 'var(--bg-card)' }}>{t('common:leadStatus.Following-up')}</option>
                            <option value="Converted" style={{ background: 'var(--bg-card)' }}>{t('common:leadStatus.Converted')}</option>
                        </select>
                    </div>

                    {/* Source Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('filters:filterLabel.source')}</label>
                        <input
                            type="text"
                            placeholder={t('filters:sourcePlaceholder')}
                            value={advancedFilters.source}
                            onChange={(e) => onAdvancedFilterChange({ ...advancedFilters, source: e.target.value })}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '13px'
                            }}
                        />
                    </div>

                    {/* Date Range Start */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('filters:filterLabel.dateStart')}</label>
                        <input
                            type="date"
                            value={advancedFilters.dateStart}
                            onChange={(e) => onAdvancedFilterChange({ ...advancedFilters, dateStart: e.target.value })}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '13px'
                            }}
                        />
                    </div>

                    {/* Date Range End */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('filters:filterLabel.dateEnd')}</label>
                        <input
                            type="date"
                            value={advancedFilters.dateEnd}
                            onChange={(e) => onAdvancedFilterChange({ ...advancedFilters, dateEnd: e.target.value })}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '13px'
                            }}
                        />
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
                            {t('filters:onlyReminders')}
                        </label>
                    </div>

                    {/* Saved Filters Section */}
                    <div style={{ 
                        gridColumn: '1 / -1', 
                        paddingTop: '15px', 
                        marginTop: '5px',
                        borderTop: '1px solid var(--glass-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('filters:filterLabel.savedFilters')}</label>
                            <button 
                                onClick={() => {
                                    const filterName = prompt(t('filters:filterNamePrompt'));
                                    if (filterName) {
                                        const saved = JSON.parse(localStorage.getItem('savedFilters') || '[]');
                                        saved.push({ name: filterName, filters: { ...advancedFilters }, id: Date.now() });
                                        localStorage.setItem('savedFilters', JSON.stringify(saved));
                                        // Noter: SearchBar direct access to showNotification? I might need to pass it or use context
                                    }
                                }}
                                style={{
                                    padding: '4px 12px',
                                    borderRadius: '8px',
                                    background: 'var(--accent-primary-transparent)',
                                    border: '1px solid var(--accent-primary)',
                                    color: 'var(--accent-primary)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                {t('filters:saveCurrentFilter')}
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {JSON.parse(localStorage.getItem('savedFilters') || '[]').map(sf => (
                                <div key={sf.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <button
                                        onClick={() => onAdvancedFilterChange(sf.filters)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            background: 'var(--glass-bg)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {sf.name}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const saved = JSON.parse(localStorage.getItem('savedFilters') || '[]');
                                            localStorage.setItem('savedFilters', JSON.stringify(saved.filter(f => f.id !== sf.id)));
                                        }}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-error)', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {JSON.parse(localStorage.getItem('savedFilters') || '[]').length === 0 && (
                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{t('filters:noSavedFilters')}</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};


export default SearchBar;
