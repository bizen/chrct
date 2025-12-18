import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface PerplexityWidgetProps {
    theme: 'dark' | 'light' | 'wallpaper';
}

export const PerplexityWidget: React.FC<PerplexityWidgetProps> = ({ theme }) => {
    const [query, setQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            window.open(`https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`, '_blank');
            setQuery('');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginLeft: '0.25rem'
            }}>
                Search
            </h3>

            <form onSubmit={handleSearch} style={{ width: '100%' }}>
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '16px',
                    border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '0.25rem 0.5rem',
                }}>
                    <div style={{ padding: '0.5rem', color: theme === 'light' ? '#9ca3af' : 'rgba(255,255,255,0.4)' }}>
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask Perplexity..."
                        style={{
                            width: '100%',
                            padding: '0.5rem 0',
                            border: 'none',
                            background: 'transparent',
                            color: theme === 'light' ? '#1f2937' : 'white',
                            fontSize: '0.9rem',
                            outline: 'none',
                            fontWeight: 500,
                        }}
                    />
                </div>
            </form>
        </div>
    );
};
