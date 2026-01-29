import React from 'react';

const SearchBar = ({ searchTerm, onSearchChange, sortOption, onSortChange }) => {
    return (
        <div style={{
            display: 'flex',
            gap: '15px',
            marginBottom: '20px',
            padding: '18px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            flexWrap: 'wrap'
        }}>
            <input
                type="text"
                placeholder="Kartvizitlerde ara... (Ad, Şirket, Şehir)"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(5px)',
                    color: 'white',
                    fontSize: '15px',
                    minWidth: '200px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                }}
                onBlur={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
            />

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
                onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
            >
                <option value="newest" style={{ background: '#2a2a2a', color: 'white' }}>En Yeni Eklenen</option>
                <option value="oldest" style={{ background: '#2a2a2a', color: 'white' }}>En Eski Eklenen</option>
                <option value="nameAsc" style={{ background: '#2a2a2a', color: 'white' }}>İsim (A-Z)</option>
                <option value="nameDesc" style={{ background: '#2a2a2a', color: 'white' }}>İsim (Z-A)</option>
                <option value="companyAsc" style={{ background: '#2a2a2a', color: 'white' }}>Şirket (A-Z)</option>
            </select>
        </div>
    );
};

export default SearchBar;
