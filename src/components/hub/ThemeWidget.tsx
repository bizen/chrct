import React from 'react';
import { Image as ImageIcon, Moon, Sun } from 'lucide-react';

export function ThemeWidget({ theme, setTheme }: { theme: 'dark' | 'light' | 'wallpaper'; setTheme: (t: 'dark' | 'light' | 'wallpaper') => void }) {
    const options = [
        { id: 'wallpaper', icon: <ImageIcon size={16} />, label: 'Wall' },
        { id: 'dark', icon: <Moon size={16} />, label: 'Dark' },
        { id: 'light', icon: <Sun size={16} />, label: 'Light' },
    ] as const;

    return (
        <div style={{
            display: 'flex',
            backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.2)',
            padding: '4px',
            borderRadius: '12px',
            border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.05)',
            gap: '2px', // Small gap between buttons
        }}>
            {options.map((opt) => {
                const isSelected = theme === opt.id;
                return (
                    <button
                        key={opt.id}
                        onClick={() => setTheme(opt.id)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem', // Reduced gap inside button
                            padding: '0.5rem 0.25rem', // Reduced horizontal padding
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: isSelected ? (theme === 'light' ? 'white' : 'rgba(255, 255, 255, 0.1)') : 'transparent',
                            color: isSelected ? (theme === 'light' ? '#111827' : 'var(--text-primary)') : (theme === 'light' ? '#6b7280' : 'var(--text-secondary)'),
                            boxShadow: isSelected && theme === 'light' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.75rem', // Smaller font
                            fontWeight: 500,
                            whiteSpace: 'nowrap', // Prevent text wrap
                        }}
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
