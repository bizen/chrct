import { StatCard } from '../StatCard';

interface CharacterCountViewProps {
    text: string;
    handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    stats: {
        characters: number;
        words: number;
        sentences: number;
        paragraphs: number;
        spaces: number;
    };
    isZenMode: boolean;
}

export function CharacterCountView({
    text,
    handleTextChange,
    stats,
    isZenMode,
}: CharacterCountViewProps) {

    return (
        <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, width: '100%', position: 'relative' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }} className="animate-in delay-200">
                <textarea
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Start typing here..."
                    spellCheck={false}
                    style={{
                        width: '100%',
                        minHeight: '400px',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '1.1rem',
                        fontFamily: 'inherit',
                        resize: 'none',
                        outline: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        transition: 'border-color 0.2s',
                    }}
                />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
            }} className={`animate-in delay-300 ${isZenMode ? 'zen-hidden' : ''}`}>
                <StatCard label="CHARACTERS" value={stats.characters} />
                <StatCard label="WORDS" value={stats.words} />
                <StatCard label="SENTENCES" value={stats.sentences} />
                <StatCard label="PARAGRAPHS" value={stats.paragraphs} />
                <StatCard label="SPACES" value={stats.spaces} />
            </div>
        </main>
    );
}
