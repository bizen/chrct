import { useState, useEffect } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';

interface Task {
    id: number;
    text: string;
    // Status can be: 'idle' (default), 'active' (in zone), 'completed')
    status: 'idle' | 'active' | 'completed';
    completedAt?: string;
}

export function TaskListWidget({ theme, onlyInput = false }: { theme: 'dark' | 'light' | 'wallpaper', onlyInput?: boolean }) {
    const [tasks, setTasks] = useState<Task[]>(() => {
        const saved = localStorage.getItem('chrct_hub_tasks');
        const initialTasks = saved ? JSON.parse(saved) : [];
        // Migration for old data (completed boolean -> status)
        return initialTasks.map((t: any) => ({
            ...t,
            status: t.status || (t.completed ? 'completed' : 'idle')
        }));
    });
    const [newTask, setNewTask] = useState('');
    const [addedEffect, setAddedEffect] = useState(false);

    useEffect(() => {
        localStorage.setItem('chrct_hub_tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: newTask.trim(), status: 'idle' }]);
        setNewTask('');
        setAddedEffect(true);
        setTimeout(() => setAddedEffect(false), 2000);
    };

    const updateTaskStatus = (id: number, newStatus: 'idle' | 'active' | 'completed') => {
        // If trying to set active, check if another is already active
        if (newStatus === 'active') {
            const hasActive = tasks.some(t => t.status === 'active' && t.id !== id);
            if (hasActive) return; // Prevent multiple active tasks
        }

        setTasks(tasks.map(t => {
            if (t.id === id) {
                // Handle Completion Logic
                if (newStatus === 'completed' && t.status !== 'completed') {
                    const today = new Date();
                    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                    // Update history
                    const history = JSON.parse(localStorage.getItem('chrct_task_history') || '{}');
                    history[dateStr] = (history[dateStr] || 0) + 1;
                    localStorage.setItem('chrct_task_history', JSON.stringify(history));
                    window.dispatchEvent(new Event('chrct-task-update'));

                    return { ...t, status: 'completed', completedAt: dateStr };
                }
                else if (t.status === 'completed' && newStatus !== 'completed') {
                    const history = JSON.parse(localStorage.getItem('chrct_task_history') || '{}');
                    const targetDate = t.completedAt || new Date().toISOString().split('T')[0];
                    if (history[targetDate] && history[targetDate] > 0) {
                        history[targetDate] -= 1;
                    }
                    localStorage.setItem('chrct_task_history', JSON.stringify(history));
                    window.dispatchEvent(new Event('chrct-task-update'));
                    return { ...t, status: newStatus, completedAt: undefined };
                }
                return { ...t, status: newStatus };
            }
            return t;
        }));
    };

    const deleteTask = (id: number) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.25rem' }}>
                Tasks
            </h3>

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
                    // Custom scrollbar for this container
                    scrollbarWidth: 'thin',
                }}>

                    {[...tasks]
                        .sort((a, b) => { // Same sort as main view
                            const score = (status: string) => {
                                if (status === 'active') return 0;
                                if (status === 'idle') return 1;
                                return 2;
                            };
                            return score(a.status) - score(b.status) || b.id - a.id;
                        })
                        .map(task => {
                            const isZoneActive = tasks.some(t => t.status === 'active');
                            const isThisActive = task.status === 'active';
                            const isDisabled = isZoneActive && !isThisActive && task.status !== 'completed';

                            return (
                                <div
                                    key={task.id}
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
                                            // Widget simplified interaction: 
                                            // If active -> complete
                                            // If idle -> active (if allowed)
                                            // If completed -> idle
                                            if (task.status === 'active') {
                                                updateTaskStatus(task.id, 'completed');
                                            } else if (task.status === 'idle') {
                                                updateTaskStatus(task.id, 'active');
                                            } else {
                                                updateTaskStatus(task.id, 'idle');
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
                                            <div style={{ // Tiny chevron for idle
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
                                            onClick={() => updateTaskStatus(task.id, 'idle')}
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
                                        onClick={() => deleteTask(task.id)}
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
        </div>
    );
}
