import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaMoon, FaSun } from 'react-icons/fa';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                color: theme === 'dark' ? '#f59e0b' : '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--glass-shadow)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'var(--glass-bg-hover)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--glass-bg)';
            }}
            title={theme === 'dark' ? 'Açık Mod' : 'Karanlık Mod'}
        >
            {theme === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} />}
        </button>
    );
};

export default ThemeToggle;
