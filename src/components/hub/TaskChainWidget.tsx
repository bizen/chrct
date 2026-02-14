import React, { useState, useRef } from 'react';
import { Play, Pause, SkipForward, ChevronLeft, ChevronRight, Check, Trash2, RotateCcw, Link, Plus, Save } from 'lucide-react';
import { useTaskChain } from './TaskChainContext';

interface TaskChainWidgetProps {
    theme: 'dark' | 'light' | 'wallpaper';
    isExpanded?: boolean;
}

export const TaskChainWidget: React.FC<TaskChainWidgetProps> = ({ theme, isExpanded = false }) => {
    const isDark = theme !== 'light';

    // --- Context ---
    const {
        tasks,
        timeRemaining,
        isRunningState: isRunning,
        activeTask,
        completedTasks,
        pendingTasks,
        isChainComplete,
        hasChainStarted,
        progress,
        totalRemaining,
        addTask,
        removeTask,
        adjustDuration,
        startChain,
        togglePause,
        skipTask,
        resetChain,
        clearAll,
        templates,
        saveTemplate,
        loadTemplate,
        deleteTemplate
    } = useTaskChain();

    // --- Local UI State ---
    const [newTaskName, setNewTaskName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // --- Handlers ---
    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        addTask(newTaskName);
        setNewTaskName('');
        inputRef.current?.focus();
    };

    const handleSaveTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        saveTemplate(templateName);
        setTemplateName('');
        setIsSaving(false);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // --- Shared styles ---
    const smallBtnStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
        cursor: 'pointer',
        padding: isExpanded ? '10px' : '4px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
    };

    const controlBtnStyle: React.CSSProperties = {
        ...smallBtnStyle,
        width: isExpanded ? '48px' : '32px',
        height: isExpanded ? '48px' : '32px',
        borderRadius: isExpanded ? '12px' : '8px',
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        color: isDark ? 'white' : '#374151',
    };

    // --- Render ---
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isExpanded ? '1.5rem' : '0.5rem', height: isExpanded ? '100%' : 'auto' }}>
            {/* Header */}
            <h3 style={{
                fontSize: isExpanded ? '1.8rem' : '0.95rem',
                fontWeight: 700,
                color: isDark ? 'rgba(255,255,255,0.95)' : '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isExpanded ? '0.75rem' : '0.5rem',
                marginBottom: isExpanded ? '1rem' : '0.25rem',
            }}>
                <Link size={isExpanded ? 24 : 16} />
                Chore Chain
            </h3>

            {/* Main Card */}
            <div style={{
                padding: isExpanded ? '2rem' : '0.75rem',
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                borderRadius: isExpanded ? '20px' : '16px',
                border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: isExpanded ? '1rem' : '0.4rem',
                flex: isExpanded ? 1 : 'unset',
                justifyContent: isExpanded ? 'center' : 'flex-start',
            }}>
                {/* Empty state */}
                {tasks.length === 0 && (
                    <div style={{
                        padding: '1rem 0.5rem',
                        textAlign: 'center',
                        fontSize: isExpanded ? '1.2rem' : '0.8rem',
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
                            gap: isExpanded ? '0.75rem' : '0.5rem',
                            padding: isExpanded ? '0.5rem 0.75rem' : '0.35rem 0.5rem',
                            borderRadius: '8px',
                            opacity: 0.4,
                        }}
                    >
                        <div style={{
                            width: isExpanded ? '24px' : '18px',
                            height: isExpanded ? '24px' : '18px',
                            borderRadius: '50%',
                            backgroundColor: '#34D399',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Check size={isExpanded ? 14 : 11} color="white" strokeWidth={3} />
                        </div>
                        <span style={{
                            fontSize: isExpanded ? '1.1rem' : '0.82rem',
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
                        padding: isExpanded ? '2rem' : '0.85rem',
                        borderRadius: isExpanded ? '16px' : '12px',
                        background: isDark
                            ? 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(129,140,248,0.08))'
                            : 'linear-gradient(135deg, rgba(96,165,250,0.1), rgba(129,140,248,0.06))',
                        border: '1px solid rgba(96,165,250,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: isExpanded ? '1.5rem' : '0.6rem',
                    }}>
                        {/* Task name */}
                        <span style={{
                            fontSize: isExpanded ? '2rem' : '0.85rem',
                            fontWeight: 700,
                            color: isDark ? 'white' : '#1f2937',
                            textAlign: 'center',
                            width: '100%',
                            lineHeight: 1.2,
                        }}>
                            {activeTask.name}
                        </span>

                        {/* Timer */}
                        <div style={{
                            fontSize: isExpanded ? '6rem' : '2.2rem',
                            fontWeight: 700,
                            color: '#60A5FA',
                            lineHeight: 1,
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: isExpanded ? '-0.02em' : 'normal',
                        }}>
                            {formatTime(timeRemaining)}
                        </div>

                        {/* Progress bar */}
                        <div style={{
                            width: '100%',
                            height: isExpanded ? '8px' : '4px',
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
                            gap: isExpanded ? '1rem' : '0.4rem',
                            width: '100%',
                            justifyContent: 'center',
                        }}>
                            {/* -3m */}
                            <button
                                onClick={() => adjustDuration(activeTask.id, -180)}
                                style={{
                                    ...controlBtnStyle,
                                    width: 'auto',
                                    padding: isExpanded ? '0 16px' : '0 8px',
                                    gap: '1px',
                                    fontSize: isExpanded ? '1rem' : '0.65rem',
                                    fontWeight: 600,
                                }}
                                title="-3 min"
                            >
                                <ChevronLeft size={isExpanded ? 20 : 12} />
                                <span>3m</span>
                            </button>

                            {/* Pause / Play */}
                            <button
                                onClick={togglePause}
                                style={{
                                    ...controlBtnStyle,
                                    width: isExpanded ? '64px' : '32px',
                                    height: isExpanded ? '64px' : '32px',
                                    borderRadius: isExpanded ? '16px' : '8px',
                                    backgroundColor: isRunning
                                        ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)')
                                        : '#60A5FA',
                                    color: isRunning
                                        ? (isDark ? 'white' : '#374151')
                                        : 'white',
                                }}
                                title={isRunning ? 'Pause' : 'Resume'}
                            >
                                {isRunning ? <Pause size={isExpanded ? 32 : 14} /> : <Play size={isExpanded ? 32 : 14} fill="white" />}
                            </button>

                            {/* Skip */}
                            <button
                                onClick={skipTask}
                                style={controlBtnStyle}
                                title="Skip"
                            >
                                <SkipForward size={isExpanded ? 24 : 14} />
                            </button>

                            {/* +3m */}
                            <button
                                onClick={() => adjustDuration(activeTask.id, 180)}
                                style={{
                                    ...controlBtnStyle,
                                    width: 'auto',
                                    padding: isExpanded ? '0 16px' : '0 8px',
                                    gap: '1px',
                                    fontSize: isExpanded ? '1rem' : '0.65rem',
                                    fontWeight: 600,
                                }}
                                title="+3 min"
                            >
                                <span>3m</span>
                                <ChevronRight size={isExpanded ? 20 : 12} />
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
                            gap: isExpanded ? '0.75rem' : '0.4rem',
                            padding: isExpanded ? '0.5rem 0.75rem' : '0.35rem 0.5rem',
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
                            width: isExpanded ? '10px' : '8px',
                            height: isExpanded ? '10px' : '8px',
                            borderRadius: '50%',
                            border: `2px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}`,
                            flexShrink: 0,
                            marginLeft: isExpanded ? '6px' : '5px',
                            marginRight: isExpanded ? '6px' : '3px',
                        }} />

                        {/* Name */}
                        <span style={{
                            fontSize: isExpanded ? '1.1rem' : '0.82rem',
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
                            gap: isExpanded ? '6px' : '2px',
                            flexShrink: 0,
                        }}>
                            <button
                                onClick={() => adjustDuration(task.id, -180)}
                                style={smallBtnStyle}
                                title="-3 min"
                            >
                                <ChevronLeft size={isExpanded ? 16 : 12} />
                            </button>
                            <span style={{
                                fontSize: isExpanded ? '0.9rem' : '0.72rem',
                                fontWeight: 600,
                                color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                                minWidth: isExpanded ? '40px' : '32px',
                                textAlign: 'center',
                            }}>
                                {formatTime(task.duration)}
                            </span>
                            <button
                                onClick={() => adjustDuration(task.id, 180)}
                                style={smallBtnStyle}
                                title="+3 min"
                            >
                                <ChevronRight size={isExpanded ? 16 : 12} />
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
                                <Trash2 size={isExpanded ? 16 : 12} />
                            </button>
                        )}
                    </div>
                ))}

                {/* Add task input */}
                {!isChainComplete && (
                    <form
                        onSubmit={handleAddTask}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isExpanded ? '0.75rem' : '0.4rem',
                            marginTop: isExpanded ? '0.5rem' : '0.15rem',
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
                                padding: isExpanded ? '0.75rem 1rem' : '0.45rem 0.65rem',
                                borderRadius: isExpanded ? '12px' : '10px',
                                border: isDark
                                    ? '1px solid rgba(255,255,255,0.08)'
                                    : '1px solid rgba(0,0,0,0.08)',
                                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                                color: isDark ? 'white' : '#1f2937',
                                fontSize: isExpanded ? '1rem' : '0.82rem',
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
                                    width: isExpanded ? '48px' : '30px',
                                    height: isExpanded ? '48px' : '30px',
                                    backgroundColor: '#60A5FA',
                                    color: 'white',
                                    borderRadius: isExpanded ? '12px' : '8px',
                                }}
                            >
                                <Plus size={isExpanded ? 24 : 14} />
                            </button>
                        )}
                    </form>
                )}
            </div>

            {/* Bottom actions */}
            {!hasChainStarted && tasks.length > 0 && (
                <div style={{ display: 'flex', gap: isExpanded ? '0.75rem' : '0.4rem' }}>
                    <button
                        onClick={startChain}
                        style={{
                            flex: 1,
                            padding: isExpanded ? '1rem' : '0.6rem',
                            borderRadius: isExpanded ? '14px' : '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #60A5FA, #818CF8)',
                            color: 'white',
                            fontSize: isExpanded ? '1.1rem' : '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isExpanded ? '0.6rem' : '0.4rem',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Play size={isExpanded ? 20 : 14} fill="white" />
                        Start Chain
                    </button>
                    <button
                        onClick={clearAll}
                        style={{
                            ...controlBtnStyle,
                            width: isExpanded ? '56px' : '36px',
                            height: isExpanded ? '56px' : '36px',
                        }}
                        title="Clear all"
                    >
                        <Trash2 size={isExpanded ? 20 : 14} />
                    </button>
                </div>
            )}

            {/* Chain complete */}
            {isChainComplete && (
                <>
                    <div style={{
                        textAlign: 'center',
                        padding: '0.5rem',
                        fontSize: isExpanded ? '1.5rem' : '0.9rem',
                        fontWeight: 600,
                        color: '#34D399',
                        marginTop: isExpanded ? '1rem' : '0',
                    }}>
                        🎉 Chain Complete!
                    </div>
                    <div style={{ display: 'flex', gap: isExpanded ? '0.75rem' : '0.4rem', marginTop: isExpanded ? '0.75rem' : '0' }}>
                        <button
                            onClick={resetChain}
                            style={{
                                flex: 1,
                                padding: isExpanded ? '0.8rem' : '0.5rem',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                color: isDark ? 'white' : '#374151',
                                fontSize: isExpanded ? '1rem' : '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            <RotateCcw size={isExpanded ? 18 : 13} />
                            Reset
                        </button>
                        <button
                            onClick={clearAll}
                            style={{
                                flex: 1,
                                padding: isExpanded ? '0.8rem' : '0.5rem',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                color: isDark ? 'white' : '#374151',
                                fontSize: isExpanded ? '1rem' : '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Trash2 size={isExpanded ? 18 : 13} />
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
                        padding: isExpanded ? '0.8rem' : '0.4rem',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                        fontSize: isExpanded ? '1rem' : '0.72rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.2s',
                        marginTop: isExpanded ? '1rem' : '0',
                    }}
                >
                    <RotateCcw size={isExpanded ? 16 : 11} />
                    Reset Chain
                </button>
            )}

            {/* Total time */}
            {tasks.length > 0 && !isChainComplete && (
                <div style={{
                    textAlign: 'center',
                    fontSize: isExpanded ? '1rem' : '0.68rem',
                    fontWeight: 500,
                    color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                    marginTop: isExpanded ? '0.5rem' : '0',
                }}>
                    {hasChainStarted ? 'Remaining' : 'Total'}: {formatTime(totalRemaining)}
                </div>
            )}

            {/* ─── Templates Section ─── */}
            <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                marginTop: isExpanded ? '1.5rem' : '0.25rem',
            }} />

            {/* Templates Header */}
            <h3 style={{
                fontSize: isExpanded ? '0.9rem' : '0.72rem',
                fontWeight: 600,
                color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginLeft: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginTop: isExpanded ? '1rem' : '0',
            }}>
                <Save size={isExpanded ? 16 : 12} />
                Templates
            </h3>

            {/* Active Templates List */}
            {templates.map(tmp => (
                <div
                    key={tmp.id}
                    onClick={() => loadTemplate(tmp)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isExpanded ? '1rem 1.2rem' : '0.4rem 0.5rem',
                        borderRadius: '8px',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
                    }}
                >
                    <span style={{
                        fontSize: isExpanded ? '1rem' : '0.75rem',
                        fontWeight: 500,
                        color: isDark ? 'rgba(255,255,255,0.8)' : '#374151',
                    }}>
                        {tmp.name} <span style={{ opacity: 0.5, fontSize: isExpanded ? '0.85rem' : '0.7rem' }}>({tmp.tasks.length})</span>
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(tmp.id);
                        }}
                        style={{
                            ...smallBtnStyle,
                            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
                            padding: isExpanded ? '8px' : '4px',
                        }}
                        title="Delete"
                    >
                        <Trash2 size={isExpanded ? 16 : 10} />
                    </button>
                </div>
            ))}

            {/* Save New Template */}
            <div style={{ marginTop: isExpanded ? '0.5rem' : '0.2rem' }}>
                {!isSaving ? (
                    <button
                        onClick={() => setIsSaving(true)}
                        disabled={tasks.length === 0}
                        style={{
                            width: '100%',
                            padding: isExpanded ? '0.8rem' : '0.4rem',
                            borderRadius: '8px',
                            border: '1px dashed ' + (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                            background: 'none',
                            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                            fontSize: isExpanded ? '0.9rem' : '0.7rem',
                            fontWeight: 500,
                            cursor: tasks.length === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            opacity: tasks.length === 0 ? 0.5 : 1,
                        }}
                    >
                        <Plus size={isExpanded ? 14 : 10} />
                        Save current chain as template
                    </button>
                ) : (
                    <form
                        onSubmit={handleSaveTemplate}
                        style={{
                            display: 'flex',
                            gap: '0.3rem',
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
                                padding: isExpanded ? '0.8rem 1rem' : '0.35rem 0.5rem',
                                borderRadius: '8px',
                                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                                color: isDark ? 'white' : '#1f2937',
                                fontSize: isExpanded ? '1rem' : '0.75rem',
                                outline: 'none',
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                ...smallBtnStyle,
                                backgroundColor: '#60A5FA',
                                color: 'white',
                                width: isExpanded ? '48px' : '24px',
                                borderRadius: '8px',
                            }}
                        >
                            <Check size={isExpanded ? 20 : 12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSaving(false)}
                            style={{
                                ...smallBtnStyle,
                                width: isExpanded ? '48px' : '24px',
                                borderRadius: '8px',
                            }}
                        >
                            <RotateCcw size={isExpanded ? 20 : 12} />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
