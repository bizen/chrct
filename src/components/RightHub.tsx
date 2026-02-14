import { useState } from 'react';
import { useAI } from '../context/AIContext';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { X, Plus, Sparkles, Loader2, Check } from 'lucide-react';

interface RightHubProps {
    theme: 'dark' | 'light' | 'wallpaper';
    isMobile?: boolean;
}

export function RightHub({ theme, isMobile = false }: RightHubProps) {
    const {
        isOpen,
        setIsOpen,
        targetTaskName,
        proposedSubtasks,
        isGenerating,
        clearProposals,
        targetSuperGoalId,
        ensureParentTask
    } = useAI() as any; // Cast for custom context props not in type yet or fix type

    // Local state to track added tasks (by index)
    const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
    const [addingIndices, setAddingIndices] = useState<Set<number>>(new Set());
    const [lastProposed, setLastProposed] = useState<string[]>([]);

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

    if (!isOpen) return null;

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

    if (isMobile) {
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
                onClick={() => setIsOpen(false)}
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
                            <Sparkles size={20} color="var(--accent-color)" />
                            AI Deconstruct
                        </h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', opacity: 0.7, padding: '0.5rem' }}
                        >
                            <X size={24} />
                        </button>
                    </div>

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
                width: '300px',
                zIndex: 40,
                display: 'flex',
                pointerEvents: 'none', // Wrapper is ghost
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
                    overflowY: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={20} color="var(--accent-color)" />
                        AI Deconstruct
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}
                    >
                        <X size={20} />
                    </button>
                </div>

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
