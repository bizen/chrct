import { useState, useEffect } from 'react';
import { useAI } from '../context/AIContext';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { X, Plus, Sparkles, Loader2, Check, Calendar, Settings } from 'lucide-react';

interface RightHubProps {
    theme: 'dark' | 'light' | 'wallpaper';
    isMobile?: boolean;
    isCalendarOpen: boolean;
}

export function RightHub({ theme, isMobile = false, isCalendarOpen }: RightHubProps) {
    const {
        isOpen,
        setIsOpen,
        targetTaskName,
        proposedSubtasks,
        isGenerating,
        clearProposals,
        targetSuperGoalId,
        ensureParentTask
    } = useAI() as any;

    // Local state to track added tasks (by index)
    const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
    const [addingIndices, setAddingIndices] = useState<Set<number>>(new Set());
    const [lastProposed, setLastProposed] = useState<string[]>([]);

    // Calendar State
    const [calendarUrl, setCalendarUrl] = useState(() => localStorage.getItem('chrct_calendar_url') || '');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTimeInvertEnabled, setIsTimeInvertEnabled] = useState(() => {
        const saved = localStorage.getItem('chrct_calendar_invert');
        return saved ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('chrct_calendar_invert', JSON.stringify(isTimeInvertEnabled));
    }, [isTimeInvertEnabled]);

    // Reset state when proposed tasks change (new deconstruction)
    if (proposedSubtasks !== lastProposed) {
        setLastProposed(proposedSubtasks);
        setAddedIndices(new Set());
        setAddingIndices(new Set());
    }

    // Reset if closed
    if (!isOpen && addedIndices.size > 0) {
        setAddedIndices(new Set());
        setAddingIndices(new Set());
    }

    // Convex mutations
    const addTaskMutation = useMutation(api.tasks.create);

    if (!isOpen && !isCalendarOpen) return null;

    const glassStyle = {
        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(29, 35, 51, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)',
        color: theme === 'light' ? '#1f2937' : 'white',
    };

    const handleAddTask = async (taskText: string, index: number) => {
        if (!targetSuperGoalId) return;
        if (addedIndices.has(index)) return;

        setAddingIndices(prev => new Set(prev).add(index));

        try {
            // Ensure parent task exists via Context (handles duplication)
            const parentId = await ensureParentTask();


            if (parentId) {
                // 2. Create Subtask (Small Goal)
                await addTaskMutation({
                    text: taskText,
                    status: 'idle',
                    parentId: parentId as Id<"tasks">, // Link to the Big Goal
                    order: 9999
                });

                // Mark as added
                setAddedIndices(prev => {
                    const next = new Set(prev);
                    next.add(index);
                    return next;
                });
            }
        } catch (e) {
            console.error("Failed to add task:", e);
        } finally {
            setAddingIndices(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    };

    const handleAddAll = async () => {
        // Serial execution to ensure parent is created once first
        for (let i = 0; i < proposedSubtasks.length; i++) {
            // Check if already added to avoid duplicates if user clicked individual then Add All
            if (!addedIndices.has(i)) {
                await handleAddTask(proposedSubtasks[i], i);
            }
        }
        setIsOpen(false);
        clearProposals();
    };

    const saveCalendarUrl = (url: string) => {
        localStorage.setItem('chrct_calendar_url', url);
        setCalendarUrl(url);
        setIsSettingsOpen(false);
    };

    // Decide what to render
    const isAIMode = isOpen; // AI takes precedence if open

    if (isMobile) {
        if (!isAIMode && !isCalendarOpen) return null;

        return (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                }}
                onClick={() => isAIMode ? setIsOpen(false) : null /* Calendar persistent on mobile? or closeable */}
            >
                <div
                    className="no-scrollbar"
                    style={{
                        ...glassStyle,
                        pointerEvents: 'auto',
                        width: '100%',
                        maxHeight: '80vh',
                        borderTopLeftRadius: '24px',
                        borderTopRightRadius: '24px',
                        border: `1px solid ${glassStyle.borderColor}`,
                        boxShadow: '0 -10px 40px -10px rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '1.5rem',
                        gap: '1rem',
                        overflowY: 'auto',
                        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onClick={e => e.stopPropagation()}
                >

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isAIMode ? <Sparkles size={20} color="var(--accent-color)" /> : <Calendar size={20} color="var(--accent-color)" />}
                            {isAIMode ? 'AI Deconstruct' : 'Calendar'}
                        </h2>
                        <button
                            onClick={() => isAIMode ? setIsOpen(false) : null} // Calendar close on mobile logic needed if we want to allow closing by X
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', opacity: 0.7, padding: '0.5rem' }}
                        >
                            {isAIMode && <X size={24} />}
                        </button>
                    </div>

                    {isAIMode ? (
                        <>
                            {/* Target Task */}
                            <div style={{
                                padding: '1rem',
                                backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                lineHeight: 1.4
                            }}>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Deconstructing:
                                </div>
                                {targetTaskName}
                            </div>

                            {/* Content */}
                            {renderContent({
                                isGenerating, proposedSubtasks, theme, handleAddAll, addedIndices, addingIndices, handleAddTask
                            })}
                        </>
                    ) : (
                        <div style={{ height: '500px' }}>
                            {/* Calendar Mobile View - Simplified */}
                            {calendarUrl ? (
                                <iframe src={calendarUrl} style={{ border: 0, width: '100%', height: '100%', borderRadius: '12px' }} frameBorder="0" scrolling="no"></iframe>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7 }}>
                                    <p>Please set your Calendar Embed URL on Desktop first.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: '6rem',
                right: '1rem',
                bottom: '2rem',
                width: isAIMode ? '300px' : '360px', // Wider for Calendar
                zIndex: 40,
                display: 'flex',
                pointerEvents: 'none', // Wrapper is ghost
                transition: 'width 0.3s ease'
            }}
        >
            <div
                className="no-scrollbar"
                style={{
                    ...glassStyle,
                    pointerEvents: 'auto', // Wrapper content is interactive
                    width: '100%',
                    height: '100%',
                    borderRadius: '24px',
                    border: `1px solid ${glassStyle.borderColor}`,
                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.5rem',
                    gap: '1rem',
                    overflowY: 'hidden' // Important for iframe
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isAIMode ? <Sparkles size={20} color="var(--accent-color)" /> : <Calendar size={20} color="var(--accent-color)" />}
                        {isAIMode ? 'AI Deconstruct' : 'Google Calendar'}
                    </h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isAIMode && (
                            <button
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                title="Calendar Settings"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}
                            >
                                <Settings size={18} />
                            </button>
                        )}
                        {isAIMode && (
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {isAIMode ? (
                    <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                        {/* Target Task */}
                        <div style={{
                            padding: '1rem',
                            backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            lineHeight: 1.4,
                            flexShrink: 0
                        }}>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Deconstructing:
                            </div>
                            {targetTaskName}
                        </div>

                        {/* Content */}
                        {renderContent({
                            isGenerating, proposedSubtasks, theme, handleAddAll, addedIndices, addingIndices, handleAddTask
                        })}
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                        {/* Settings Overlay */}
                        {isSettingsOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0,
                                padding: '1rem',
                                backgroundColor: theme === 'light' ? '#fff' : '#1e293b',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                zIndex: 10,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Calendar Embed URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://calendar.google.com/calendar/embed?src=..."
                                        defaultValue={calendarUrl}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                saveCalendarUrl(e.currentTarget.value);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--input-bg)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.8rem'
                                        }}
                                    />
                                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                        Go to Google Calendar Settings &gt; Integrate calendar &gt; Embed code. Copy the info in "src" attribute.
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                                            if (input) saveCalendarUrl(input.value);
                                        }}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            background: 'var(--accent-color)',
                                            color: 'white',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.8rem',
                                            marginTop: '0.5rem'
                                        }}
                                    >
                                        Save URL
                                    </button>
                                </div>

                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                    {/* Theme Optimization Toggle */}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={isTimeInvertEnabled}
                                            onChange={(e) => setIsTimeInvertEnabled(e.target.checked)}
                                            style={{ accentColor: 'var(--accent-color)' }}
                                        />
                                        <span>Optimize for Dark Theme</span>
                                    </label>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                                        Inverts colors to blend with chrct's dark aesthetic.
                                    </p>
                                </div>
                            </div>
                        )}

                        {calendarUrl ? (
                            <iframe
                                src={calendarUrl}
                                style={{
                                    border: 0,
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '12px',
                                    filter: (theme !== 'light' && isTimeInvertEnabled) ? 'invert(0.93) hue-rotate(180deg) contrast(0.9)' : 'none',
                                    transition: 'filter 0.5s ease',
                                    opacity: (theme !== 'light' && isTimeInvertEnabled) ? 0.8 : 1
                                }}
                                frameBorder="0"
                                scrolling="no"
                            ></iframe>
                        ) : (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                opacity: 0.7,
                                textAlign: 'center',
                                padding: '1rem'
                            }}>
                                <Calendar size={48} strokeWidth={1.5} />
                                <div>
                                    <p style={{ fontWeight: 600 }}>No Calendar Set</p>
                                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Click the settings icon to add your Google Calendar Embed URL.</p>
                                </div>
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        background: 'var(--accent-color)',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 600
                                    }}
                                >
                                    Setup Calendar
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper to keep main component clean
function renderContent({ isGenerating, proposedSubtasks, handleAddAll, addedIndices, addingIndices, handleAddTask }: any) {
    return (
        isGenerating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', opacity: 0.7 }}>
                <Loader2 size={32} className="animate-spin" color="var(--accent-color)" />
                <span style={{ fontSize: '0.9rem' }}>Thinking...</span>
            </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.6 }}>PROPOSED TASKS</span>
                    {proposedSubtasks.length > 0 && (
                        <button
                            onClick={handleAddAll}
                            style={{
                                fontSize: '0.75rem',
                                color: 'var(--accent-color)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Add All
                        </button>
                    )}
                </div>

                {proposedSubtasks.map((task: string, idx: number) => (
                    <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-bg)'
                    }}>
                        <div style={{ flex: 1, fontSize: '0.9rem' }}>{task}</div>
                        <button
                            onClick={() => handleAddTask(task, idx)}
                            disabled={addedIndices.has(idx) || addingIndices.has(idx)}
                            style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: addedIndices.has(idx) ? '#10B981' : 'rgba(16, 185, 129, 0.1)',
                                color: addedIndices.has(idx) ? 'white' : '#10B981',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: (addedIndices.has(idx) || addingIndices.has(idx)) ? 'default' : 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.2s'
                            }}
                            title={addedIndices.has(idx) ? "Added" : "Add this task"}
                        >
                            {addedIndices.has(idx) ? (
                                <Check size={16} />
                            ) : (
                                <Plus size={16} />
                            )}
                        </button>
                    </div>
                ))}

                {proposedSubtasks.length === 0 && !isGenerating && (
                    <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem', padding: '2rem 0' }}>
                        No suggestions generated.
                    </div>
                )}
            </div>
        )
    );
}

// Empty component removed
