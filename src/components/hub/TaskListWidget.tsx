import React, { useState, useEffect } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';

interface Task {
    id: number;
    text: string;
    completed: boolean;
    completedAt?: string;
}

export function TaskListWidget({ theme }: { theme: 'dark' | 'light' | 'wallpaper' }) {
    const [tasks, setTasks] = useState<Task[]>(() => {
        const saved = localStorage.getItem('chrct_hub_tasks');
        return saved ? JSON.parse(saved) : [];
    });
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        localStorage.setItem('chrct_hub_tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: newTask.trim(), completed: false }]);
        setNewTask('');
    };

    const toggleTask = (id: number) => {
        setTasks(tasks.map(t => {
            if (t.id === id) {
                const isCompleting = !t.completed;
                const today = new Date();
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                // Update history
                const history = JSON.parse(localStorage.getItem('chrct_task_history') || '{}');

                if (isCompleting) {
                    history[dateStr] = (history[dateStr] || 0) + 1;
                    localStorage.setItem('chrct_task_history', JSON.stringify(history));
                    window.dispatchEvent(new Event('chrct-task-update'));
                    return { ...t, completed: true, completedAt: dateStr };
                } else {
                    // Decrement count for the day it was completed, or today if unknown
                    const targetDate = t.completedAt || dateStr;
                    if (history[targetDate] && history[targetDate] > 0) {
                        history[targetDate] -= 1;
                    }
                    localStorage.setItem('chrct_task_history', JSON.stringify(history));
                    window.dispatchEvent(new Event('chrct-task-update'));
                    return { ...t, completed: false, completedAt: undefined };
                }
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

            <form onSubmit={addTask} style={{ display: 'flex', gap: '0.5rem' }}>
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
            </form>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                overflowY: 'auto',
                paddingRight: '0.5rem',
                // Custom scrollbar for this container
                scrollbarWidth: 'thin',
            }}>

                {tasks.map(task => (
                    <div
                        key={task.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            backgroundColor: task.completed ? (theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)') : (theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'),
                            transition: 'all 0.2s',
                        }}
                    >
                        <button
                            onClick={() => toggleTask(task.id)}
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '6px',
                                border: `1px solid ${task.completed ? 'var(--accent-color)' : (theme === 'light' ? '#9ca3af' : 'var(--text-secondary)')}`,
                                backgroundColor: task.completed ? 'var(--accent-color)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                flexShrink: 0,
                            }}
                        >
                            {task.completed && <Check size={12} color="white" />}
                        </button>
                        <span style={{
                            flex: 1,
                            fontSize: '0.9rem',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            color: task.completed ? (theme === 'light' ? '#9ca3af' : 'var(--text-secondary)') : (theme === 'light' ? '#1f2937' : 'var(--text-primary)'),
                            opacity: task.completed ? 0.6 : 1,
                        }}>
                            {task.text}
                        </span>
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
                ))}
            </div>
        </div>
    );
}
