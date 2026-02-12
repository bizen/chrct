import React from 'react';
import { StatCard } from '../StatCard';
import { PageTitle } from '../PageTitle';
import { useConvexAuth } from 'convex/react';
import type { SyncStatus } from '../../hooks/useCloudSync';

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
    saveStatus?: SyncStatus;
}

export const CharacterCountView: React.FC<CharacterCountViewProps> = ({
    text,
    handleTextChange,
    stats,
    isZenMode,
    saveStatus = 'synced',
}) => {
    const { isAuthenticated } = useConvexAuth();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
            <PageTitle title="writing" />
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', flex: 1 }}>
                {/* Text Area Container */}
                <div style={{ flex: 2, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
                    <textarea
                        value={text}
                        onChange={handleTextChange}
                        placeholder="Start typing..."
                        spellCheck={false}
                        style={{
                            width: '100%',
                            height: '100%',
                            minHeight: '60vh',
                            padding: '1.5rem',
                            borderRadius: '16px',
                            border: 'none',
                            fontSize: '1.25rem',
                            lineHeight: '1.6',
                            resize: 'none',
                            outline: 'none',
                            backgroundColor: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            transition: 'all 0.3s ease',
                            fontFamily: 'inherit',
                        }}
                    />
                    {/* Sync Indicator */}
                    {isAuthenticated && (
                        <div style={{
                            position: 'absolute',
                            bottom: '1rem',
                            right: 'calc(33% + 2rem)', // Position near textarea bottom-right
                            fontSize: '0.75rem',
                            opacity: 0.5,
                            pointerEvents: 'none',
                            color: saveStatus === 'offline' ? 'var(--accent-color)' : 'inherit'
                        }}>
                            {saveStatus === 'saving' ? 'Saving...' : (saveStatus === 'offline' ? 'Offline (Saved)' : 'Synced')}
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className={`no-scrollbar ${isZenMode ? 'zen-hidden' : ''}`} style={{
                    flex: 1,
                    minWidth: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    maxHeight: '80vh',
                    overflowY: 'auto'
                }}>
                    <StatCard label="Characters" value={stats.characters} />
                    <StatCard label="Words" value={stats.words} />
                    <StatCard label="Sentences" value={stats.sentences} />
                    <StatCard label="Paragraphs" value={stats.paragraphs} />
                    <StatCard label="Spaces" value={stats.spaces} />
                </div>
            </div>
        </div>
    );
};
