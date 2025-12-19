import React, { useState, useEffect, useRef } from 'react';
import { StatCard } from '../StatCard';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

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

export const CharacterCountView: React.FC<CharacterCountViewProps> = ({
    text,
    handleTextChange,
    stats,
    isZenMode,
}) => {
    const { isAuthenticated } = useConvexAuth();

    // Cloud Sync Logic
    const remoteDoc = useQuery(api.sync.getDocument, isAuthenticated ? {} : "skip");
    const saveDocument = useMutation(api.sync.saveDocument);
    const syncDocument = useMutation(api.sync.syncDocument);

    // Debounce Ref
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track if we have already loaded the remote text to avoid overwriting typed content
    const [hasLoadedRemote, setHasLoadedRemote] = useState(false);

    // Initial Sync: Local -> Cloud (Only if cloud is empty)
    useEffect(() => {
        if (isAuthenticated && remoteDoc !== undefined && remoteDoc === null && !hasLoadedRemote) {
            // Cloud is empty, but we have local text?
            // Actually, 'text' prop comes from App.tsx state which is initialized from localStorage.
            if (text && text.length > 0) {
                syncDocument({ text });
            }
            setHasLoadedRemote(true);
        } else if (isAuthenticated && remoteDoc && !hasLoadedRemote) {
            // Cloud has data, load it into App state (We need a way to bubble this up?)
            // The current props `text` and `handleTextChange` are controlled by App.tsx.
            // We can't easily change App.tsx state from here without an explicit setter or hijacking the event.
            // Option: Fire a synthetic event or effectively "replace" the text.

            // This acts as "loading" the saved text.
            const fakeEvent = {
                target: { value: remoteDoc.text }
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleTextChange(fakeEvent);
            setHasLoadedRemote(true);
        }
    }, [isAuthenticated, remoteDoc, hasLoadedRemote, text, syncDocument, handleTextChange]); // Added dependencies to avoid loops, hopefully.

    // Save to Cloud on Change (Debounced)
    const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        // 1. Update UI immediately
        handleTextChange(e);

        // 2. Cloud Save
        if (isAuthenticated) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            const newText = e.target.value;
            saveTimeoutRef.current = setTimeout(() => {
                saveDocument({ text: newText });
                saveTimeoutRef.current = null; // Clear ref after save
            }, 1000); // Auto-save after 1 second of inactivity
        }
    };

    return (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', flex: 1, position: 'relative' }}>
            {/* Text Area Container */}
            <div style={{ flex: 2, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
                <textarea
                    value={text}
                    onChange={onTextChange}
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
                        pointerEvents: 'none'
                    }}>
                        {saveTimeoutRef.current !== null ? 'Saving...' : 'Synced'}
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
    );
};
