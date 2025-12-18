
interface CharacterCountWidgetProps {
    text: string;
    handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    stats: {
        characters: number;
        words: number;
        sentences: number;
        paragraphs: number;
        spaces: number;
    };
    theme: 'dark' | 'light' | 'wallpaper';
}

export function CharacterCountWidget({ text, handleTextChange, stats, theme }: CharacterCountWidgetProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.25rem' }}>
                Character Count
            </h3>

            <textarea
                value={text}
                onChange={handleTextChange}
                placeholder="Type here..."
                style={{
                    width: '100%',
                    height: '150px',
                    backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                    border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: theme === 'light' ? '#1f2937' : 'white',
                    fontSize: '0.9rem',
                    resize: 'none',
                    outline: 'none',
                }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{
                    backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.characters}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>CHARS</div>
                </div>
                <div style={{
                    backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.words}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>WORDS</div>
                </div>
            </div>
        </div>
    );
}
