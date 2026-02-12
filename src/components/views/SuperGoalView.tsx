import { useState, useEffect } from 'react';
import { useQuery, useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Plus, ArrowRight, Edit2, Check, X, CheckCircle2, ChevronDown, ChevronUp, ArrowLeft, Rocket, Trash2 } from 'lucide-react';
import { TaskListView } from './TaskListView';
import { PageTitle } from '../PageTitle';

// Extended type to include Convex _id
interface SuperGoalDB {
    _id: Id<"superGoals">;
    userId: string;
    text: string;
    description?: string;
    bigGoalIds: string[];
    color?: string;
    order: number;
    createdAt: number;
}

interface SuperGoalViewProps {
    theme: 'dark' | 'light' | 'wallpaper';
    onNavigateToLaunchpad: () => void;
}

export function SuperGoalView({ theme, onNavigateToLaunchpad }: SuperGoalViewProps) {
    // Convex data for Big Goals (Tasks)
    const { isAuthenticated } = useConvexAuth();
    const rawTasks = useQuery(api.tasks.get, isAuthenticated ? undefined : "skip") || [];

    // Convex data for Super Goals
    const remoteSuperGoals = useQuery(api.superGoals.get, isAuthenticated ? {} : "skip");
    const createSuperGoalMutation = useMutation(api.superGoals.create);
    const updateSuperGoalMutation = useMutation(api.superGoals.update);
    const removeSuperGoalMutation = useMutation(api.superGoals.remove);
    const syncLocalSuperGoals = useMutation(api.superGoals.syncLocalData);

    // Derive superGoals from the query result
    const superGoals: SuperGoalDB[] = remoteSuperGoals || [];

    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [newGoalText, setNewGoalText] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Migration: localStorage -> Convex (runs once)
    useEffect(() => {
        if (!isAuthenticated) return;
        if (remoteSuperGoals === undefined) return; // Still loading
        if (remoteSuperGoals === null) return; // Error state

        const localData = localStorage.getItem('chrct_super_goals');
        if (!localData) return;

        try {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed) && parsed.length > 0 && remoteSuperGoals.length === 0) {
                // Migrate localStorage to DB
                syncLocalSuperGoals({ superGoals: parsed }).then(() => {
                    localStorage.removeItem('chrct_super_goals');
                    console.log("Super Goals migrated from localStorage to Convex DB");
                }).catch(e => {
                    console.error("Super Goals migration failed:", e);
                });
            } else {
                // DB already has data, clear stale localStorage
                localStorage.removeItem('chrct_super_goals');
            }
        } catch (e) {
            console.error("Failed to parse local Super Goals:", e);
            localStorage.removeItem('chrct_super_goals');
        }
    }, [isAuthenticated, remoteSuperGoals, syncLocalSuperGoals]);

    // Auto-assign unassigned root tasks to a default Super Goal
    useEffect(() => {
        if (rawTasks.length === 0) return;
        if (!remoteSuperGoals || remoteSuperGoals.length === 0) return;

        const assignedTaskIds = new Set<string>();
        superGoals.forEach(sg => sg.bigGoalIds.forEach(id => assignedTaskIds.add(id)));
        const unassignedTasks = rawTasks.filter((t: any) => !t.parentId && !assignedTaskIds.has(t._id));

        if (unassignedTasks.length > 0) {
            // Find or pick the first Super Goal as default
            const defaultGoal = superGoals[0];
            if (defaultGoal) {
                const newBigGoalIds = [...defaultGoal.bigGoalIds, ...unassignedTasks.map((t: any) => t._id)];
                updateSuperGoalMutation({
                    id: defaultGoal._id,
                    bigGoalIds: newBigGoalIds,
                }).catch(e => console.error("Failed to auto-assign tasks:", e));
            }
        }
    }, [rawTasks, superGoals, remoteSuperGoals, updateSuperGoalMutation]);

    const handleCreateSuperGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoalText.trim()) return;
        createSuperGoalMutation({
            text: newGoalText.trim(),
            bigGoalIds: [],
            createdAt: Date.now(),
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            order: superGoals.length,
        }).catch(e => console.error("Failed to create Super Goal:", e));
        setNewGoalText('');
        setIsCreating(false);
    };

    const updateSuperGoal = (id: string, updates: Partial<SuperGoalDB>) => {
        const { _id, userId, createdAt, ...safeUpdates } = updates as any;
        updateSuperGoalMutation({
            id: id as Id<"superGoals">,
            ...safeUpdates,
        }).catch(e => console.error("Failed to update Super Goal:", e));

    };

    const handleDeleteSuperGoal = (id: string) => {
        removeSuperGoalMutation({
            id: id as Id<"superGoals">,
        }).catch(e => console.error("Failed to delete Super Goal:", e));
        setDeleteConfirmId(null);
    };



    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '2rem',
            padding: '1rem 0',
            width: '100%',
            maxWidth: '900px',
            margin: '0 auto',
            color: theme === 'light' ? '#1f2937' : 'white',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0',
        }
    };

    // Detail View Render
    if (selectedGoalId) {
        const selectedGoal = superGoals.find(g => g._id === selectedGoalId);
        if (selectedGoal) {
            return (
                <SuperGoalDetail
                    superGoal={selectedGoal}
                    rawTasks={rawTasks}
                    theme={theme}
                    allSuperGoals={superGoals}
                    updateSuperGoalMutation={updateSuperGoalMutation}
                    onBack={() => setSelectedGoalId(null)}
                    onUpdateGoal={updateSuperGoal}
                    onNavigateToLaunchpad={onNavigateToLaunchpad}
                />
            );
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <PageTitle title="super goals" />

                {!isCreating ? (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="hover-scale"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '12px',
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <Plus size={20} />
                        New Super Goal
                    </button>
                ) : (
                    <form onSubmit={handleCreateSuperGoal} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            autoFocus
                            value={newGoalText}
                            onChange={e => setNewGoalText(e.target.value)}
                            placeholder="Enter Super Goal title..."
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--card-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '1rem',
                            }}
                            onBlur={() => !newGoalText && setIsCreating(false)}
                        />
                        <button type="submit" style={{ display: 'none' }}>Submit</button>
                    </form>
                )}
            </div>

            {superGoals.map(sg => (
                <SuperGoalCard
                    key={sg._id}
                    superGoal={sg}
                    rawTasks={rawTasks}
                    theme={theme}
                    onUpdate={updateSuperGoal}
                    onDelete={() => setDeleteConfirmId(sg._id)}
                    onNavigateToDetail={() => setSelectedGoalId(sg._id)}
                />
            ))}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <DeleteConfirmModal
                    theme={theme}
                    goalName={superGoals.find(g => g._id === deleteConfirmId)?.text || ''}
                    onConfirm={() => handleDeleteSuperGoal(deleteConfirmId)}
                    onCancel={() => setDeleteConfirmId(null)}
                />
            )}
        </div>
    );
}

// --- Delete Confirmation Modal ---
function DeleteConfirmModal({ theme, goalName, onConfirm, onCancel }: {
    theme: string;
    goalName: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
        }} onClick={onCancel}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: theme === 'light' ? '#fff' : '#1e1e23',
                    borderRadius: '20px',
                    padding: '2rem',
                    maxWidth: '420px',
                    width: '90%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Trash2 size={20} color="#ef4444" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: theme === 'light' ? '#1f2937' : 'white' }}>
                        Delete Super Goal
                    </h3>
                </div>

                <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.7, lineHeight: 1.5, color: theme === 'light' ? '#1f2937' : 'white' }}>
                    Are you sure you want to delete <strong>"{goalName}"</strong>?
                    The Big Goals inside will become unassigned and will be reassigned to another Super Goal automatically.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '10px',
                            border: theme === 'light' ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)',
                            background: 'transparent',
                            color: theme === 'light' ? '#1f2937' : 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#ef4444',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                        }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}



const PRESET_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B'
];

interface SuperGoalCardProps {
    superGoal: SuperGoalDB;
    rawTasks: any[];
    theme: 'dark' | 'light' | 'wallpaper';
    onUpdate: (id: string, updates: Partial<SuperGoalDB>) => void;
    onDelete: () => void;
    onNavigateToDetail: () => void;
}

function SuperGoalCard({ superGoal, rawTasks, theme, onUpdate, onDelete, onNavigateToDetail }: SuperGoalCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [editText, setEditText] = useState(superGoal.text);
    const [editDesc, setEditDesc] = useState(superGoal.description || '');
    const [isExpanded, setIsExpanded] = useState(false);

    // Update local editing state if superGoal prop changes
    useEffect(() => {
        setEditText(superGoal.text);
        setEditDesc(superGoal.description || '');
    }, [superGoal.text, superGoal.description]);

    const relevantTasks = rawTasks.filter((t: any) => superGoal.bigGoalIds.includes(t._id));
    const totalTasks = relevantTasks.length;
    const completedTasks = relevantTasks.filter((t: any) => t.status === 'completed').length;
    const activeTasks = relevantTasks.filter((t: any) => t.status !== 'completed');

    const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

    // Filtered display list
    const tasksToShow = isExpanded ? activeTasks : activeTasks.slice(0, 3);
    const hasMore = activeTasks.length > 3;

    const handleSave = () => {
        onUpdate(superGoal._id, { text: editText, description: editDesc });
        setIsEditing(false);
    };

    const styles = {
        card: {
            backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,35,0.6)',
            backdropFilter: 'blur(12px)',
            borderRadius: '24px',
            padding: '2rem',
            border: theme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '1.5rem',
            transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
            position: 'relative' as const,
            overflow: 'visible' as const,
        },
        cardHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        title: {
            fontSize: '1.8rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flex: 1,
        },
        progressBar: {
            height: '6px',
            width: '100%',
            backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            borderRadius: '3px',
            overflow: 'hidden',
        },
        progressFill: (progress: number, color: string) => ({
            height: '100%',
            width: `${progress * 100}%`,
            backgroundColor: color,
            borderRadius: '3px',
            transition: 'width 0.5s ease-out',
        }),
        bigGoalsList: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '0.5rem',
        },
        bigGoalItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1rem',
            opacity: 0.8,
            padding: '0.5rem',
            borderRadius: '8px',
            backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
        }
    };

    return (
        <div style={styles.card}>
            <div style={styles.cardHeader}>
                <div style={{ flex: 1 }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', paddingRight: '1rem' }}>
                            <input
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                style={{
                                    fontSize: '1.8rem',
                                    fontWeight: 800,
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--accent-color)',
                                    background: 'var(--card-bg)',
                                    color: 'var(--text-primary)',
                                    width: '100%'
                                }}
                            />
                            <textarea
                                value={editDesc}
                                onChange={e => setEditDesc(e.target.value)}
                                placeholder="Description (optional)"
                                style={{
                                    fontSize: '1rem',
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--card-bg)',
                                    color: 'var(--text-primary)',
                                    width: '100%',
                                    minHeight: '60px',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={handleSave}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        background: 'var(--accent-color)',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    <Check size={16} /> Save
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    <X size={16} /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <h2 style={styles.title}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setIsColorPickerOpen(!isColorPickerOpen); }}
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            backgroundColor: superGoal.color,
                                            flexShrink: 0,
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 0,
                                            transition: 'transform 0.2s',
                                            boxShadow: '0 0 0 2px transparent'
                                        }}
                                        className="hover-scale"
                                        title="Change Color"
                                    />
                                    {isColorPickerOpen && (
                                        <>
                                            <div
                                                style={{ position: 'fixed', inset: 0, zIndex: 100, cursor: 'default' }}
                                                onClick={(e) => { e.stopPropagation(); setIsColorPickerOpen(false); }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                top: '24px',
                                                left: '-8px',
                                                zIndex: 101,
                                                backgroundColor: theme === 'light' ? 'white' : '#1e1e23',
                                                padding: '12px',
                                                borderRadius: '16px',
                                                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px var(--border-color)',
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(4, 1fr)',
                                                gap: '8px',
                                                width: 'max-content',
                                                cursor: 'default',
                                            }} onClick={e => e.stopPropagation()}>
                                                {PRESET_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdate(superGoal._id, { color: c });
                                                            setIsColorPickerOpen(false);
                                                        }}
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            backgroundColor: c,
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: 0,
                                                            transform: superGoal.color === c ? 'scale(1.1)' : 'scale(1)',
                                                            boxShadow: superGoal.color === c ? '0 0 0 2px var(--text-primary)' : 'none',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title={c}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                {superGoal.text}
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '0.5rem',
                                        opacity: 0.5,
                                        transition: 'opacity 0.2s',
                                        marginLeft: '0.5rem'
                                    }}
                                    className="hover-opacity"
                                    title="Edit Super Goal"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={onDelete}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: '0.5rem',
                                        opacity: 0.4,
                                        transition: 'opacity 0.2s',
                                    }}
                                    className="hover-opacity"
                                    title="Delete Super Goal"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </h2>
                            {superGoal.description && (
                                <p style={{ margin: '0 0 0 1.5rem', opacity: 0.6, fontSize: '0.95rem' }}>
                                    {superGoal.description}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* New Progress Pill */}
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'flex-start', marginLeft: '1rem' }}>
                    <div style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-secondary)'
                    }}>
                        <CheckCircle2 size={16} color={superGoal.color || 'var(--accent-color)'} />
                        <span>{completedTasks} / {totalTasks}</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={styles.progressBar}>
                <div style={styles.progressFill(progress, superGoal.color || 'var(--accent-color)')} />
            </div>

            {/* Incomplete Big Goals List */}
            <div style={styles.bigGoalsList}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    opacity: 0.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.25rem'
                }}>
                    <span>Active Big Goals ({activeTasks.length})</span>
                </div>

                {tasksToShow.map((bg: any) => (
                    <div key={bg._id} style={styles.bigGoalItem}>
                        <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: `2px solid ${superGoal.color || 'var(--accent-color)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'transparent',
                        }} />
                        <span style={{
                            fontWeight: 500,
                            flex: 1,
                        }}>
                            {bg.text}
                        </span>
                    </div>
                ))}

                {hasMore && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            marginTop: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            opacity: 0.8,
                            transition: 'opacity 0.2s'
                        }}
                        className="hover-opacity"
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? 'Show Less' : `Show All (${activeTasks.length})`}
                    </button>
                )}

                {activeTasks.length === 0 && totalTasks > 0 && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.6, fontStyle: 'italic', padding: '1rem', textAlign: 'center', color: 'var(--accent-color)' }}>
                        All Big Goals completed! 🎉
                    </div>
                )}

                {totalTasks === 0 && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.4, fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                        No Big Goals assigned yet.
                    </div>
                )}
            </div>

            {/* Action Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: theme === 'light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={onNavigateToDetail}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 1rem',
                        borderRadius: '8px',
                        background: 'var(--card-bg)',
                        border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}
                    className="hover-bg"
                >
                    Manage Big Goals <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}

// ... SuperGoalDetail Component ...
function SuperGoalDetail({ superGoal, theme, allSuperGoals, updateSuperGoalMutation, onBack, onUpdateGoal, onNavigateToLaunchpad }: any) {
    const filterTaskIds = new Set<string>(superGoal.bigGoalIds || []);

    const handleTaskCreated = (taskId: string) => {
        onUpdateGoal(superGoal._id, { bigGoalIds: [...(superGoal.bigGoalIds || []), taskId] });
    };

    const handleMoveBigGoal = (taskId: string, toSuperGoalId: string) => {
        const toGoal = allSuperGoals.find((sg: SuperGoalDB) => sg._id === toSuperGoalId);
        if (!toGoal) return;

        // Remove from current Super Goal
        const newFromIds = (superGoal.bigGoalIds || []).filter((id: string) => id !== taskId);
        // Add to destination (avoid duplicates)
        const newToIds = toGoal.bigGoalIds.includes(taskId)
            ? toGoal.bigGoalIds
            : [...toGoal.bigGoalIds, taskId];

        updateSuperGoalMutation({
            id: superGoal._id,
            bigGoalIds: newFromIds,
        }).catch((e: any) => console.error("Failed to remove task from source Super Goal:", e));

        updateSuperGoalMutation({
            id: toGoal._id,
            bigGoalIds: newToIds,
        }).catch((e: any) => console.error("Failed to add task to destination Super Goal:", e));
    };

    // Build superGoalContext for TaskListView
    const otherSuperGoals = allSuperGoals.filter((sg: SuperGoalDB) => sg._id !== superGoal._id);
    const superGoalContext = otherSuperGoals.length > 0 ? {
        currentSuperGoalId: superGoal._id,
        otherSuperGoals: otherSuperGoals.map((sg: SuperGoalDB) => ({ id: sg._id, text: sg.text, color: sg.color })),
        onMoveBigGoal: handleMoveBigGoal,
    } : undefined;

    return (
        <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '1rem 0',
            color: theme === 'light' ? '#1f2937' : 'white',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            <PageTitle title="management" />
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }}>
                    <ArrowLeft size={24} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: superGoal.color }} />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{superGoal.text}</h1>
                </div>
                <button
                    onClick={onNavigateToLaunchpad}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 1rem',
                        borderRadius: '8px',
                        background: 'var(--accent-color)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                    }}
                    className="hover-scale"
                >
                    <Rocket size={16} /> Launchpad
                </button>
            </div>

            {/* Task List View with filtered tasks */}
            <div style={{ flex: 1 }}>
                <TaskListView
                    theme={theme}
                    filterTaskIds={filterTaskIds}
                    onTaskCreated={handleTaskCreated}
                    superGoalContext={superGoalContext}
                />
            </div>
        </div>
    );
}
