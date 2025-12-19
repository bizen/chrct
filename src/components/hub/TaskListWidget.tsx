import { useState, useMemo } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface Task {
    _id: Id<"tasks">;
    text: string;
    status: 'idle' | 'active' | 'completed';
    parentId?: Id<"tasks">;
    order?: number;
}

import { useConvexAuth } from 'convex/react';

export function TaskListWidget({ theme, onlyInput = false }: { theme: 'dark' | 'light' | 'wallpaper', onlyInput?: boolean }) {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const rawTasks = useQuery(api.tasks.get, isAuthenticated ? {} : "skip");
    const addTaskMutation = useMutation(api.tasks.create);
    const updateTaskMutation = useMutation(api.tasks.update);
    const deleteTaskMutation = useMutation(api.tasks.remove);

    const [newTask, setNewTask] = useState('');
    const [addedEffect, setAddedEffect] = useState(false);

    // Filter and sort tasks for widget
    const displayTasks = useMemo(() => {
        if (!rawTasks) return [];
        // Show only root tasks in widget? Or all? 
        // Previously it was flat list from local storage which didn't strictly enforce hierarchy.
        // Let's filter for root tasks to keep it clean.
        return rawTasks
            .filter((t: any) => !t.parentId && t.status !== 'completed') // Hide completed in widget usually? Or show?
            // Original code showed completed.
            // Original filter:
            // .filter(task => ...) -> check render loop
            // It mapped over `[...tasks].sort(...)`. All tasks were shown.
            .filter((t: any) => !t.parentId) // Only roots
            .sort((a: any, b: any) => {
                const score = (status: string) => {
                    if (status === 'active') return 0;
                    if (status === 'idle') return 1;
                    return 2;
                };
                return score(a.status) - score(b.status) || (a.order || 0) - (b.order || 0);
            }) as Task[];
    }, [rawTasks]);

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        // Calculate order: last
        const order = rawTasks ? rawTasks.filter((t: any) => !t.parentId).length : 0;

        addTaskMutation({
            text: newTask.trim(),
            status: 'idle',
            order
        });

        setNewTask('');
        setAddedEffect(true);
        setTimeout(() => setAddedEffect(false), 2000);
    };

    const updateTaskStatus = (id: Id<"tasks">, newStatus: 'idle' | 'active' | 'completed') => {
        // Check active constraint
        if (newStatus === 'active') {
            const hasActive = rawTasks?.some((t: any) => t.status === 'active' && t._id !== id);
            if (hasActive) return;
        }

        let updates: any = { status: newStatus };
        if (newStatus === 'completed') {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            updates.completedAt = dateStr;
        } else {
            // If un-completing, we might want to unset completedAt, but Convex optional needing null/undefined is tricky.
            // We'll leave it or ignore it.
        }

        updateTaskMutation({ id, ...updates });
    };

    const deleteTask = (id: Id<"tasks">) => {
        deleteTaskMutation({ id });
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0, opacity: 0.5 }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.25rem' }}>
                    Tasks
                </h3>
                <div style={{ height: '36px', borderRadius: '8px', backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.25rem' }}>
                Tasks
            </h3>

            {!isAuthenticated && (
                <div style={{
                    padding: '1rem',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    opacity: 0.7
                }}>
                    Sign in to manage tasks
                </div>
            )}

            {isAuthenticated && (
                <>
                    <form onSubmit={addTask} style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                        <input
                            type="text"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder="Add a task..."
                            style={{
                                flex: 1,
                                padding: '0.5rem 0.75rem',
                                backgroundColor: 'transparent',
                                border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid var(--border-color)',
                                borderRadius: '8px',
                                color: theme === 'light' ? '#1f2937' : 'var(--text-primary)',
                                fontSize: '0.9rem',
                                outline: 'none',
                                fontFamily: 'inherit',
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                background: 'var(--accent-color)',
                                border: 'none',
                                borderRadius: '8px',
                                width: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            <Plus size={16} />
                        </button>

                        {/* Visual Feedback for Task Added */}
                        <div style={{
                            position: 'absolute',
                            top: '-25px',
                            right: '0',
                            background: 'var(--accent-color)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            opacity: addedEffect ? 1 : 0,
                            transform: addedEffect ? 'translateY(0)' : 'translateY(10px)',
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            pointerEvents: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}>
                            Task added!
                        </div>
                    </form>

                    {!onlyInput && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            overflowY: 'auto',
                            paddingRight: '0.5rem',
                            scrollbarWidth: 'thin',
                        }}>

                            {displayTasks.map((task: Task) => {
                                const isZoneActive = rawTasks?.some((t: any) => t.status === 'active');
                                const isThisActive = task.status === 'active';
                                const isDisabled = isZoneActive && !isThisActive && task.status !== 'completed';

                                return (
                                    <div
                                        key={task._id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            backgroundColor: isThisActive
                                                ? (theme === 'light' ? '#eff6ff' : 'rgba(96, 165, 250, 0.1)')
                                                : (task.status === 'completed'
                                                    ? (theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)')
                                                    : (theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)')),
                                            border: isThisActive
                                                ? '1px solid var(--accent-color)'
                                                : '1px solid transparent',
                                            transition: 'all 0.2s',
                                            opacity: isDisabled ? 0.3 : (task.status === 'completed' ? 0.6 : 1),
                                            pointerEvents: isDisabled ? 'none' : 'auto',
                                        }}
                                    >
                                        <button
                                            onClick={() => {
                                                if (task.status === 'active') {
                                                    updateTaskStatus(task._id, 'completed');
                                                } else if (task.status === 'idle') {
                                                    updateTaskStatus(task._id, 'active');
                                                } else {
                                                    updateTaskStatus(task._id, 'idle');
                                                }
                                            }}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '6px',
                                                border: `1px solid ${task.status === 'active' || task.status === 'completed' ? 'var(--accent-color)' : (theme === 'light' ? '#9ca3af' : 'var(--text-secondary)')}`,
                                                backgroundColor: task.status === 'active' || task.status === 'completed' ? 'var(--accent-color)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                padding: 0,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {(task.status === 'completed' || task.status === 'active') && <Check size={12} color="white" />}
                                            {task.status === 'idle' && (
                                                <div style={{
                                                    borderTop: '3px solid transparent',
                                                    borderBottom: '3px solid transparent',
                                                    borderLeft: '5px solid var(--text-secondary)',
                                                    marginLeft: '2px'
                                                }} />
                                            )}
                                        </button>
                                        <span style={{
                                            flex: 1,
                                            fontSize: '0.9rem',
                                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                            color: task.status === 'completed' ? (theme === 'light' ? '#9ca3af' : 'var(--text-secondary)') : (theme === 'light' ? '#1f2937' : 'var(--text-primary)'),
                                            fontWeight: task.status === 'active' ? 700 : 400,
                                        }}>
                                            {task.text}
                                        </span>

                                        {/* Stop Button for Active Task */}
                                        {task.status === 'active' && (
                                            <button
                                                onClick={() => updateTaskStatus(task._id, 'idle')}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    color: '#EF4444',
                                                    cursor: 'pointer',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    marginRight: '4px',
                                                }}
                                                title="Stop Task"
                                            >
                                                Stop
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteTask(task._id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: theme === 'light' ? '#9ca3af' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                opacity: 0.6,
                                            }}
                                            className="hover-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
