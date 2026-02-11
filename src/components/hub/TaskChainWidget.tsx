import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, ChevronLeft, ChevronRight, Check, Trash2, RotateCcw, Link, Plus, Save } from 'lucide-react';

interface ChainTemplate {
    id: string;
    name: string;
    tasks: { name: string; duration: number }[];
}

interface ChainTask {
    id: string;
    name: string;
    duration: number; // seconds
    status: 'pending' | 'active' | 'completed';
}

interface TaskChainWidgetProps {
    theme: 'dark' | 'light' | 'wallpaper';
}

export const TaskChainWidget: React.FC<TaskChainWidgetProps> = ({ theme }) => {
    const isDark = theme !== 'light';

    // --- State ---
    const [tasks, setTasks] = useState<ChainTask[]>(() => {
        try {
            const saved = localStorage.getItem('chrct_chain_tasks');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [timeRemaining, setTimeRemaining] = useState<number>(() => {
        try {
            const saved = localStorage.getItem('chrct_chain_time');
            return saved ? parseInt(saved, 10) : 0;
        } catch { return 0; }
    });

    const [isRunning, setIsRunning] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Templates ---
    const [templates, setTemplates] = useState<ChainTemplate[]>(() => {
        try {
            const saved = localStorage.getItem('chrct_chain_templates');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [isSaving, setIsSaving] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // Ref to avoid stale closure in effects
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    // Tracks whether the timer has actually been started and ticked
    // Prevents completion handler from firing on initial mount when timeRemaining is 0
    const hasTimerStartedRef = useRef(false);

    // --- Derived ---
    const activeTask = tasks.find(t => t.status === 'active');
    const activeIndex = tasks.findIndex(t => t.status === 'active');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const isChainComplete = tasks.length > 0 && tasks.every(t => t.status === 'completed');
    const hasChainStarted = tasks.some(t => t.status === 'active' || t.status === 'completed');
    const progress = activeTask && activeTask.duration > 0
        ? (activeTask.duration - timeRemaining) / activeTask.duration
        : 0;
    const totalRemaining = (activeTask ? timeRemaining : 0) +
        pendingTasks.reduce((sum, t) => sum + t.duration, 0);

    // --- Persist ---
    useEffect(() => {
        localStorage.setItem('chrct_chain_tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        localStorage.setItem('chrct_chain_time', timeRemaining.toString());
    }, [timeRemaining]);

    useEffect(() => {
        localStorage.setItem('chrct_chain_templates', JSON.stringify(templates));
    }, [templates]);

    // --- Timer tick ---
    useEffect(() => {
        if (!isRunning) return;
        const id = setInterval(() => {
            setTimeRemaining(prev => {
                const next = Math.max(0, prev - 1);
                if (next === 0) {
                    hasTimerStartedRef.current = true; // mark that timer naturally reached 0
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [isRunning]);

    // --- Completion handler ---
    const sendNotification = useCallback((title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }, []);

    useEffect(() => {
        // Only fire when timer naturally ticked down to 0, not on initial mount
        if (timeRemaining !== 0 || !isRunning || !hasTimerStartedRef.current) return;
        hasTimerStartedRef.current = false; // reset flag

        const current = tasksRef.current;
        const idx = current.findIndex(t => t.status === 'active');
        if (idx === -1) return;

        const finished = current[idx];
        const next = current[idx + 1];

        sendNotification(
            `✅ ${finished.name}`,
            next ? `Next: ${next.name}` : 'Chain complete! 🎉'
        );

        setTasks(prev => prev.map((t, i) => {
            if (i === idx) return { ...t, status: 'completed' as const };
            if (i === idx + 1 && t.status === 'pending') return { ...t, status: 'active' as const };
            return t;
        }));

        if (next) {
            setTimeRemaining(next.duration);
        } else {
            setIsRunning(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRemaining, isRunning]);

    // --- Handlers ---
    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        const name = newTaskName.trim();
        if (!name) return;

        setTasks(prev => [...prev, {
            id: Date.now().toString(),
            name,
            duration: 300, // 5 min default
            status: 'pending' as const,
        }]);
        setNewTaskName('');
        inputRef.current?.focus();
    };

    const removeTask = (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const adjustDuration = (id: string, delta: number) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        if (task.status === 'active') {
            setTimeRemaining(prev => Math.max(60, prev + delta));
        }
        setTasks(prev => prev.map(t => {
            if (t.id === id && t.status !== 'completed') {
                return { ...t, duration: Math.max(60, t.duration + delta) };
            }
            return t;
        }));
    };

    const startChain = () => {
        // Request notification permission (fire and forget)
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const firstPendingIdx = tasks.findIndex(t => t.status === 'pending');
        if (firstPendingIdx === -1) return;

        const firstDuration = tasks[firstPendingIdx].duration;
        hasTimerStartedRef.current = false; // ensure clean start
        setTasks(prev => prev.map((t, i) =>
            i === firstPendingIdx ? { ...t, status: 'active' as const } : t
        ));
        setTimeRemaining(firstDuration);
        setIsRunning(true);
    };

    const togglePause = () => setIsRunning(prev => !prev);

    const skipTask = () => {
        if (activeIndex === -1) return;
        const next = tasks[activeIndex + 1];

        setTasks(prev => prev.map((t, i) => {
            if (i === activeIndex) return { ...t, status: 'completed' as const };
            if (i === activeIndex + 1 && t.status === 'pending') return { ...t, status: 'active' as const };
            return t;
        }));

        if (next) {
            setTimeRemaining(next.duration);
        } else {
            setIsRunning(false);
            setTimeRemaining(0);
        }
    };

    const resetChain = () => {
        setIsRunning(false);
        setTimeRemaining(0);
        setTasks(prev => prev.map(t => ({ ...t, status: 'pending' as const })));
    };

    const clearAll = () => {
        setIsRunning(false);
        setTimeRemaining(0);
        setTasks([]);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // --- Template handlers ---
    const saveTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        const name = templateName.trim();
        if (!name || tasks.length === 0) return;

        const newTemplate: ChainTemplate = {
            id: Date.now().toString(),
            name,
            tasks: tasks.map(t => ({ name: t.name, duration: t.duration })),
        };
        setTemplates(prev => [...prev, newTemplate]);
        setTemplateName('');
        setIsSaving(false);
    };

    const loadTemplate = (template: ChainTemplate) => {
        setIsRunning(false);
        setTimeRemaining(0);
        setTasks(template.tasks.map((t, i) => ({
            id: `${Date.now()}-${i}`,
            name: t.name,
            duration: t.duration,
            status: 'pending' as const,
        })));
    };

    const deleteTemplate = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    // --- Shared styles ---
    const smallBtnStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
    };

    const controlBtnStyle: React.CSSProperties = {
        ...smallBtnStyle,
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        color: isDark ? 'white' : '#374151',
    };

    // --- Render ---
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Header */}
            <h3 style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: isDark ? 'rgba(255,255,255,0.95)' : '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '0.25rem',
            }}>
                <Link size={16} />
                Chore Chain
            </h3>

            {/* Main Card */}
            <div style={{
                padding: '0.75rem',
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                borderRadius: '16px',
                border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
            }}>
                {/* Empty state */}
                {tasks.length === 0 && (
                    <div style={{
                        padding: '1rem 0.5rem',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        opacity: 0.45,
                        color: isDark ? 'white' : '#374151',
                    }}>
                        Add tasks to build a chain
                    </div>
                )}

                {/* Completed tasks */}
                {completedTasks.map(task => (
                    <div
                        key={task.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '8px',
                            opacity: 0.4,
                        }}
                    >
                        <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: '#34D399',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Check size={11} color="white" strokeWidth={3} />
                        </div>
                        <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            textDecoration: 'line-through',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {task.name}
                        </span>
                    </div>
                ))}

                {/* Active task */}
                {activeTask && (
                    <div style={{
                        padding: '0.85rem',
                        borderRadius: '12px',
                        background: isDark
                            ? 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(129,140,248,0.08))'
                            : 'linear-gradient(135deg, rgba(96,165,250,0.1), rgba(129,140,248,0.06))',
                        border: '1px solid rgba(96,165,250,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.6rem',
                    }}>
                        {/* Task name */}
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: isDark ? 'white' : '#1f2937',
                            textAlign: 'center',
                            width: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {activeTask.name}
                        </span>

                        {/* Timer */}
                        <div style={{
                            fontSize: '2.2rem',
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            letterSpacing: '-0.02em',
                            color: '#60A5FA',
                            lineHeight: 1,
                        }}>
                            {formatTime(timeRemaining)}
                        </div>

                        {/* Progress bar */}
                        <div style={{
                            width: '100%',
                            height: '4px',
                            borderRadius: '2px',
                            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.min(progress * 100, 100)}%`,
                                background: 'linear-gradient(90deg, #60A5FA, #818CF8)',
                                borderRadius: '2px',
                                transition: 'width 1s linear',
                            }} />
                        </div>

                        {/* Controls row */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            width: '100%',
                            justifyContent: 'center',
                        }}>
                            {/* -3m */}
                            <button
                                onClick={() => adjustDuration(activeTask.id, -180)}
                                style={{
                                    ...controlBtnStyle,
                                    gap: '1px',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    width: 'auto',
                                    padding: '0 8px',
                                }}
                                title="-3 min"
                            >
                                <ChevronLeft size={12} />
                                <span>3m</span>
                            </button>

                            {/* Pause / Play */}
                            <button
                                onClick={togglePause}
                                style={{
                                    ...controlBtnStyle,
                                    backgroundColor: isRunning
                                        ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)')
                                        : '#60A5FA',
                                    color: isRunning
                                        ? (isDark ? 'white' : '#374151')
                                        : 'white',
                                }}
                                title={isRunning ? 'Pause' : 'Resume'}
                            >
                                {isRunning ? <Pause size={14} /> : <Play size={14} fill="white" />}
                            </button>

                            {/* Skip */}
                            <button
                                onClick={skipTask}
                                style={controlBtnStyle}
                                title="Skip"
                            >
                                <SkipForward size={14} />
                            </button>

                            {/* +3m */}
                            <button
                                onClick={() => adjustDuration(activeTask.id, 180)}
                                style={{
                                    ...controlBtnStyle,
                                    gap: '1px',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    width: 'auto',
                                    padding: '0 8px',
                                }}
                                title="+3 min"
                            >
                                <span>3m</span>
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Pending tasks */}
                {pendingTasks.map(task => (
                    <div
                        key={task.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '8px',
                            transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = isDark
                                ? 'rgba(255,255,255,0.04)'
                                : 'rgba(0,0,0,0.03)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        {/* Dot */}
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            border: `2px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}`,
                            flexShrink: 0,
                            marginLeft: '5px',
                            marginRight: '3px',
                        }} />

                        {/* Name */}
                        <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: isDark ? 'rgba(255,255,255,0.8)' : '#374151',
                        }}>
                            {task.name}
                        </span>

                        {/* Time adjust */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            flexShrink: 0,
                        }}>
                            <button
                                onClick={() => adjustDuration(task.id, -180)}
                                style={smallBtnStyle}
                                title="-3 min"
                            >
                                <ChevronLeft size={12} />
                            </button>
                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                                minWidth: '32px',
                                textAlign: 'center',
                            }}>
                                {formatTime(task.duration)}
                            </span>
                            <button
                                onClick={() => adjustDuration(task.id, 180)}
                                style={smallBtnStyle}
                                title="+3 min"
                            >
                                <ChevronRight size={12} />
                            </button>
                        </div>

                        {/* Delete (only when chain not started) */}
                        {!hasChainStarted && (
                            <button
                                onClick={() => removeTask(task.id)}
                                style={{
                                    ...smallBtnStyle,
                                    color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
                                }}
                                title="Remove"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                ))}

                {/* Add task input */}
                {!isChainComplete && (
                    <form
                        onSubmit={addTask}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginTop: '0.15rem',
                        }}
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={newTaskName}
                            onChange={e => setNewTaskName(e.target.value)}
                            placeholder="Add task..."
                            style={{
                                flex: 1,
                                padding: '0.45rem 0.65rem',
                                borderRadius: '10px',
                                border: isDark
                                    ? '1px solid rgba(255,255,255,0.08)'
                                    : '1px solid rgba(0,0,0,0.08)',
                                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                                color: isDark ? 'white' : '#1f2937',
                                fontSize: '0.82rem',
                                outline: 'none',
                                fontWeight: 500,
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => {
                                e.currentTarget.style.borderColor = 'rgba(96,165,250,0.4)';
                            }}
                            onBlur={e => {
                                e.currentTarget.style.borderColor = isDark
                                    ? 'rgba(255,255,255,0.08)'
                                    : 'rgba(0,0,0,0.08)';
                            }}
                        />
                        {newTaskName.trim() && (
                            <button
                                type="submit"
                                style={{
                                    ...controlBtnStyle,
                                    width: '30px',
                                    height: '30px',
                                    backgroundColor: '#60A5FA',
                                    color: 'white',
                                    borderRadius: '8px',
                                }}
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </form>
                )}
            </div>

            {/* Bottom actions */}
            {!hasChainStarted && tasks.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                        onClick={startChain}
                        style={{
                            flex: 1,
                            padding: '0.6rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #60A5FA, #818CF8)',
                            color: 'white',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Play size={14} fill="white" />
                        Start Chain
                    </button>
                    <button
                        onClick={clearAll}
                        style={{
                            ...controlBtnStyle,
                            width: '36px',
                            height: '36px',
                        }}
                        title="Clear all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {/* Chain complete */}
            {isChainComplete && (
                <>
                    <div style={{
                        textAlign: 'center',
                        padding: '0.5rem',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#34D399',
                    }}>
                        🎉 Chain Complete!
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                            onClick={resetChain}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                color: isDark ? 'white' : '#374151',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            <RotateCcw size={13} />
                            Reset
                        </button>
                        <button
                            onClick={clearAll}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                color: isDark ? 'white' : '#374151',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Trash2 size={13} />
                            Clear
                        </button>
                    </div>
                </>
            )}

            {/* Running controls: reset button */}
            {hasChainStarted && !isChainComplete && (
                <button
                    onClick={resetChain}
                    style={{
                        padding: '0.4rem',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.2s',
                    }}
                >
                    <RotateCcw size={11} />
                    Reset Chain
                </button>
            )}

            {/* Total time */}
            {tasks.length > 0 && !isChainComplete && (
                <div style={{
                    textAlign: 'center',
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}>
                    {hasChainStarted ? 'Remaining' : 'Total'}: {formatTime(totalRemaining)}
                </div>
            )}

            {/* ─── Templates Section ─── */}
            <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                marginTop: '0.25rem',
            }} />

            {/* Templates Header */}
            <h3 style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginLeft: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
            }}>
                Templates
                {templates.length > 0 && (
                    <span style={{
                        fontSize: '0.62rem',
                        opacity: 0.6,
                        fontWeight: 500,
                    }}>
                        {templates.length}
                    </span>
                )}
            </h3>

            {/* Templates Content */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
            }}>
                {/* Save current chain as template */}
                {tasks.length > 0 && !isSaving && (
                    <button
                        onClick={() => setIsSaving(true)}
                        style={{
                            padding: '0.45rem',
                            borderRadius: '10px',
                            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                            backgroundColor: 'transparent',
                            color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s',
                        }}
                    >
                        <Save size={12} />
                        Save current as template
                    </button>
                )}

                {/* Save form */}
                {isSaving && (
                    <form
                        onSubmit={saveTemplate}
                        style={{
                            display: 'flex',
                            gap: '0.35rem',
                        }}
                    >
                        <input
                            type="text"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            placeholder="Template name..."
                            autoFocus
                            style={{
                                flex: 1,
                                padding: '0.4rem 0.6rem',
                                borderRadius: '8px',
                                border: isDark
                                    ? '1px solid rgba(255,255,255,0.1)'
                                    : '1px solid rgba(0,0,0,0.1)',
                                background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.9)',
                                color: isDark ? 'white' : '#1f2937',
                                fontSize: '0.78rem',
                                outline: 'none',
                                fontWeight: 500,
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!templateName.trim()}
                            style={{
                                ...controlBtnStyle,
                                width: '30px',
                                height: '30px',
                                backgroundColor: templateName.trim() ? '#60A5FA' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                                color: templateName.trim() ? 'white' : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'),
                                cursor: templateName.trim() ? 'pointer' : 'default',
                            }}
                        >
                            <Check size={14} />
                        </button>
                    </form>
                )}

                {/* Template list */}
                {templates.length === 0 && !isSaving && (
                    <div style={{
                        padding: '0.6rem',
                        textAlign: 'center',
                        fontSize: '0.72rem',
                        opacity: 0.35,
                        color: isDark ? 'white' : '#374151',
                    }}>
                        No templates saved
                    </div>
                )}

                {templates.map(tpl => (
                    <div
                        key={tpl.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '10px',
                            backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)',
                            border: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
                            transition: 'all 0.15s',
                            cursor: 'pointer',
                        }}
                        onClick={() => loadTemplate(tpl)}
                        onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = isDark
                                ? 'rgba(96,165,250,0.1)'
                                : 'rgba(96,165,250,0.06)';
                            e.currentTarget.style.borderColor = 'rgba(96,165,250,0.2)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = isDark
                                ? 'rgba(0,0,0,0.15)'
                                : 'rgba(0,0,0,0.03)';
                            e.currentTarget.style.borderColor = isDark
                                ? 'rgba(255,255,255,0.04)'
                                : 'rgba(0,0,0,0.04)';
                        }}
                    >
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: isDark ? 'rgba(255,255,255,0.85)' : '#374151',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {tpl.name}
                            </div>
                            <div style={{
                                fontSize: '0.65rem',
                                color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
                                fontWeight: 500,
                                marginTop: '1px',
                            }}>
                                {tpl.tasks.length} tasks · {formatTime(tpl.tasks.reduce((s, t) => s + t.duration, 0))}
                            </div>
                        </div>

                        {/* Delete */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteTemplate(tpl.id);
                            }}
                            style={{
                                ...smallBtnStyle,
                                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
                                flexShrink: 0,
                            }}
                            title="Delete template"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
