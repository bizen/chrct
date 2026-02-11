import { useState, useEffect, useRef, memo } from 'react';
import { Check, Trash2, GitBranch, GripVertical, Repeat } from 'lucide-react';

export interface Task {
    id: string;
    text: string;
    status: 'idle' | 'active' | 'completed';
    completedAt?: string;
    completedTimestamp?: number;
    firstMove?: string;
    subtasks?: Task[];
    totalTime?: number;
    activeSince?: number;
    parentId?: string;
    order?: number;
    dailyRepeat?: boolean;
    inDailyList?: boolean;
}

export interface TaskRowProps {
    task: Task;
    depth: number;
    isZoneActive: boolean;
    theme: 'dark' | 'light' | 'wallpaper';
    firstMoveModal?: { isOpen: boolean; taskId: string | null };
    firstMoveText?: string;
    timeLeft: number;
    now: number;
    isMobile: boolean;
    isMobileMenuOpen?: boolean;
    onMobileMenuOpenChange?: (isOpen: boolean) => void;
    handlers: {
        updateTaskStatus: (id: string, status: 'idle' | 'active' | 'completed') => void;
        updateTaskText: (id: string, text: string) => void;
        deleteTask: (id: string) => void;
        addSubtask?: (parentId: string) => void; // Optional for SuperGoal view
        initiateZone: (id: string) => void;
        confirmZone?: () => void;
        cancelZone?: () => void;
        setFirstMoveText?: (text: string) => void;
        toggleDailyRepeat?: (id: string) => void; // Optional
    };
    dragHandleAttributes?: any;
    dragHandleListeners?: any;
}

interface TaskInputProps {
    initialText: string;
    taskId: string;
    isCompleted: boolean;
    isActive: boolean;
    isMobile: boolean;
    onUpdate: (id: string, text: string) => void;
}

const TaskInput = memo(({ initialText, taskId, isCompleted, isActive, isMobile, onUpdate }: TaskInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const isComposingRef = useRef(false);

    // Block any value sync while user is composing or input is focused
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        const handleFocus = () => {
            // Focus logic if needed
        };

        input.addEventListener('focus', handleFocus);
        return () => {
            input.removeEventListener('focus', handleFocus);
        };
    }, []);

    // Handle composition events for IME (Japanese, etc.)
    const handleCompositionStart = () => {
        isComposingRef.current = true;
    };

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
        isComposingRef.current = false;
        // Trigger update immediately after composition ends
        if (e.currentTarget.value !== initialText) {
            onUpdate(taskId, e.currentTarget.value);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (e.target.value !== initialText) {
            onUpdate(taskId, e.target.value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isComposingRef.current) {
            (e.currentTarget as HTMLInputElement).blur();
        }
    };

    return (
        <input
            ref={inputRef}
            className="task-text-input"
            defaultValue={initialText}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={isCompleted}
            style={{
                fontSize: isMobile ? '1rem' : '1.2rem',
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                fontWeight: isActive ? 600 : 400,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                flex: 1,
                fontFamily: 'inherit',
                padding: 0,
                margin: 0,
                transition: 'color 0.2s',
                width: '100%',
                minWidth: 0,
            }}
        />
    );
}, (prev, next) => {
    return (
        prev.taskId === next.taskId &&
        prev.isCompleted === next.isCompleted &&
        prev.isActive === next.isActive &&
        prev.isMobile === next.isMobile
    );
});

// Helper to format time
const formatTime = (ms: number): string => {
    if (!ms) return '00:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));

    const secStr = seconds.toString().padStart(2, '0');
    const minStr = minutes.toString().padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${minStr}:${secStr}`;
    }
    return `${minStr}:${secStr}`;
};

export const TaskRow = ({
    task, depth, isZoneActive, theme, firstMoveModal, now, isMobile, handlers,
    onMobileMenuOpenChange, dragHandleAttributes, dragHandleListeners
}: TaskRowProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMobileMenuOpen(false);
                onMobileMenuOpenChange?.(false);
            }
        };
        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen, onMobileMenuOpenChange]);

    const isThisActive = task.status === 'active';
    const isDisabled = isZoneActive && !isThisActive && task.status !== 'completed';
    const isPrompting = firstMoveModal?.isOpen && firstMoveModal.taskId === task.id;
    const isCompleted = task.status === 'completed';

    const currentSessionTime = isThisActive && task.activeSince ? (now - task.activeSince) : 0;
    const totalDisplayTime = (task.totalTime || 0) + currentSessionTime;
    const hasTime = totalDisplayTime > 0;

    return (
        <div
            className={`group ${depth > 0 ? 'subtask-indent' : ''}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.35rem' : '0.5rem',
                marginLeft: depth > 0 ? (isMobile ? '0.5rem' : `${depth * 1.5}rem`) : '0',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            <div
                className="task-row"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '0.6rem' : '0.75rem',
                    padding: isMobile ? '0.9rem 0.3rem' : '1rem',
                    position: 'relative',
                    borderRadius: isPrompting ? '16px 16px 0 0' : (isMobile ? '12px' : '16px'),
                    backgroundColor: isThisActive
                        ? (theme === 'light' ? '#eff6ff' : 'rgba(96, 165, 250, 0.1)')
                        : (isCompleted
                            ? 'transparent'
                            : 'var(--card-bg)'),
                    border: isThisActive
                        ? '2px solid var(--accent-color)'
                        : (isPrompting
                            ? '2px solid #EF4444'
                            : '1px solid var(--border-color)'),
                    borderBottom: isPrompting ? 'none' : (isThisActive ? '2px solid var(--accent-color)' : undefined),
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: isDisabled ? 0.3 : (isCompleted ? 0.8 : 1),
                    pointerEvents: isDisabled ? 'none' : 'auto',
                    transform: isThisActive && !isMobile ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isThisActive
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 5px 10px -5px rgba(0, 0, 0, 0.1)'
                        : (isCompleted ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'),
                }}
            >
                {/* Drag Handle / Menu Trigger */}
                {!isZoneActive && !isCompleted && (
                    <div ref={menuRef} style={{ position: 'relative' }}>
                        <div
                            {...(!isMobile ? dragHandleAttributes : {})}
                            {...(!isMobile ? dragHandleListeners : {})}
                            onClick={isMobile ? () => {
                                const newState = !isMobileMenuOpen;
                                setIsMobileMenuOpen(newState);
                                onMobileMenuOpenChange?.(newState);
                            } : undefined}
                            style={{
                                cursor: isMobile ? 'pointer' : 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--text-secondary)',
                                opacity: isMobile ? 0.5 : 0.3,
                                marginRight: '-0.25rem',
                                transition: 'opacity 0.2s',
                            }}
                            title={isMobile ? "Open menu" : "Drag to reorder"}
                            className="hover:opacity-100"
                        >
                            <GripVertical size={20} />
                        </div>

                        {/* Mobile Menu Dropdown */}
                        {isMobile && isMobileMenuOpen && (
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: '100%',
                                marginTop: '4px',
                                backgroundColor: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '8px',
                                minWidth: '160px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                                zIndex: 9999,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                animation: 'fadeIn 0.15s ease-out',
                            }}>
                                {/* Daily Repeat Toggle - Only for root tasks */}
                                {depth === 0 && handlers.toggleDailyRepeat && (
                                    <button
                                        onClick={() => {
                                            handlers.toggleDailyRepeat?.(task.id);
                                            setIsMobileMenuOpen(false);
                                            onMobileMenuOpenChange?.(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            background: task.dailyRepeat ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: task.dailyRepeat ? 'var(--accent-color)' : 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontWeight: 500,
                                            fontFamily: 'inherit',
                                            transition: 'all 0.2s',
                                            width: '100%',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <Repeat size={16} />
                                        <span>{task.dailyRepeat ? 'Daily ON' : 'Daily OFF'}</span>
                                    </button>
                                )}

                                {/* Add Subtask - Only for root tasks */}
                                {depth === 0 && handlers.addSubtask && (
                                    <button
                                        onClick={() => {
                                            handlers.addSubtask?.(task.id);
                                            setIsMobileMenuOpen(false);
                                            onMobileMenuOpenChange?.(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontWeight: 500,
                                            fontFamily: 'inherit',
                                            transition: 'all 0.2s',
                                            width: '100%',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <GitBranch size={16} />
                                        <span>Add Subtask</span>
                                    </button>
                                )}

                                {/* Delete */}
                                <button
                                    onClick={() => {
                                        handlers.deleteTask(task.id);
                                        setIsMobileMenuOpen(false);
                                        onMobileMenuOpenChange?.(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#EF4444',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        fontFamily: 'inherit',
                                        transition: 'all 0.2s',
                                        width: '100%',
                                        textAlign: 'left',
                                    }}
                                >
                                    <Trash2 size={16} />
                                    <span>Delete</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Check Button */}
                <button
                    onClick={() => {
                        if (task.status === 'active') {
                            handlers.updateTaskStatus(task.id, 'completed');
                        } else if (task.status === 'idle') {
                            handlers.initiateZone(task.id);
                        } else {
                            handlers.updateTaskStatus(task.id, 'idle');
                        }
                    }}
                    style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        border: `2px solid ${isThisActive || isCompleted ? 'var(--accent-color)' : 'var(--text-secondary)'}`,
                        backgroundColor: isThisActive || isCompleted ? 'var(--accent-color)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: 'scale(1)',
                    }}
                    title={isThisActive ? "Complete Task" : (task.status === 'idle' ? "Start Task (Zone)" : "Mark Incomplete")}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {(isCompleted || isThisActive) && <Check size={16} color="white" strokeWidth={3} />}
                    {task.status === 'idle' && (
                        <div style={{
                            width: 0,
                            height: 0,
                            borderTop: '5px solid transparent',
                            borderBottom: '5px solid transparent',
                            borderLeft: '8px solid var(--text-secondary)',
                            marginLeft: '3px',
                            opacity: 0.8
                        }} />
                    )}
                </button>

                {/* Task Text & Input */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TaskInput
                            initialText={task.text}
                            taskId={task.id}
                            isCompleted={isCompleted}
                            isActive={isThisActive}
                            isMobile={isMobile}
                            onUpdate={handlers.updateTaskText}
                        />
                        {/* Daily Repeat Indicator */}
                        {task.dailyRepeat && !isThisActive && (
                            <div style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                color: 'var(--accent-color)',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                border: '1px solid rgba(96, 165, 250, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }} title="Repeats Daily">
                                <Repeat size={10} strokeWidth={3} />
                                <span>Daily</span>
                            </div>
                        )}
                        {!isMobile && (
                            <div style={{ display: 'flex', gap: '4px', opacity: 0.2, transition: 'opacity 0.2s' }} className="group-hover:opacity-100">
                                {depth === 0 && handlers.toggleDailyRepeat && (
                                    <button
                                        onClick={() => handlers.toggleDailyRepeat?.(task.id)}
                                        style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: task.dailyRepeat ? 'var(--accent-color)' : 'inherit' }}
                                        title="Toggle Daily Repeat"
                                    >
                                        <Repeat size={14} />
                                    </button>
                                )}
                                {depth === 0 && handlers.addSubtask && (
                                    <button
                                        onClick={() => handlers.addSubtask?.(task.id)}
                                        style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
                                        title="Add Subtask"
                                    >
                                        <GitBranch size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handlers.deleteTask(task.id)}
                                    style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info (Time, Streak) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '0.5rem' }}>
                    {hasTime && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: isThisActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                            fontWeight: isThisActive ? 600 : 400,
                            fontSize: '0.9rem',
                            opacity: isCompleted ? 0.6 : 1,
                        }}>
                            <span>{formatTime(totalDisplayTime)}</span>
                        </div>
                    )}
                </div>
            </div>
            {/* Subtasks would be rendered by parent mapping logic, not here in the single row */}
        </div>
    );
};
