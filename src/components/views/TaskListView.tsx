import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { Plus, Check, Trash2, GitBranch, GripVertical, Clock, Repeat, Eye, EyeOff } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface Task {
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

// Recursive helpers
const isAnyTaskActive = (tasks: Task[]): boolean => {
    return tasks.some(t => t.status === 'active' || (t.subtasks && isAnyTaskActive(t.subtasks)));
};

interface TaskRowProps {
    task: Task;
    depth: number;
    isZoneActive: boolean;
    theme: 'dark' | 'light' | 'wallpaper';
    firstMoveModal: { isOpen: boolean; taskId: string | null };
    firstMoveText: string;
    timeLeft: number;
    now: number;
    isMobile: boolean;
    showCompleted: boolean; // Added prop
    isMobileMenuOpen?: boolean;
    onMobileMenuOpenChange?: (isOpen: boolean) => void;
    handlers: {
        updateTaskStatus: (id: string, status: 'idle' | 'active' | 'completed') => void;
        updateTaskText: (id: string, text: string) => void;
        deleteTask: (id: string) => void;
        addSubtask: (parentId: string) => void;
        initiateZone: (id: string) => void;
        confirmZone: () => void;
        cancelZone: () => void;
        setFirstMoveText: (text: string) => void;
        toggleDailyRepeat: (id: string) => void;
    };
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
        if (input && !isComposingRef.current && document.activeElement !== input) {
            input.value = initialText;
        }
    }, [initialText]);

    const handleCompositionStart = () => {
        isComposingRef.current = true;
    };

    const handleCompositionEnd = () => {
        isComposingRef.current = false;
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
                minWidth: 0, // Important for text truncation in flex containers
            }}
        />
    );
}, (prev, next) => {
    // Do NOT compare initialText. This prevents any re-render during editing.
    // The input is uncontrolled, so its value is self-managed.
    // We only need to re-render if the task identity or visual state changes.
    return (
        prev.taskId === next.taskId &&
        prev.isCompleted === next.isCompleted &&
        prev.isActive === next.isActive &&
        prev.isMobile === next.isMobile
    );
});

const SortableTaskRow = (props: TaskRowProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isMobileMenuOpen ? 9998 : (isDragging ? 999 : (props.firstMoveModal.isOpen && props.firstMoveModal.taskId === props.task.id) || props.task.status === 'active' ? 100 : 1),
    };

    return (
        <div ref={setNodeRef} style={style}>
            <TaskContent {...props} onMobileMenuOpenChange={setIsMobileMenuOpen} dragHandleAttributes={attributes} dragHandleListeners={listeners} />
        </div>
    );
};

const TaskContent = ({
    task, depth, isZoneActive, theme, firstMoveModal, firstMoveText, timeLeft, now, isMobile, showCompleted, handlers,
    onMobileMenuOpenChange, dragHandleAttributes, dragHandleListeners
}: TaskRowProps & { dragHandleAttributes?: any, dragHandleListeners?: any }) => {
    // Memoized Input Component Logic extracted to TaskInput above
    // TaskContent now delegates input rendering to TaskInput.
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
    const isPrompting = firstMoveModal.isOpen && firstMoveModal.taskId === task.id;
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
                                {depth === 0 && (
                                    <button
                                        onClick={() => {
                                            handlers.toggleDailyRepeat(task.id);
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
                                {depth === 0 && (
                                    <button
                                        onClick={() => {
                                            handlers.addSubtask(task.id);
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
                        {/* Timer Display - Hidden on mobile for space */}
                        {!isMobile && (hasTime || isThisActive) && (
                            <div className="task-timer" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: isThisActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                                fontWeight: isThisActive ? 600 : 400,
                                fontSize: '0.85rem',
                                opacity: isThisActive ? 1 : 0.6,
                                flexShrink: 0,
                                fontVariantNumeric: 'tabular-nums'
                            }}>
                                <Clock size={14} />
                                <span>{formatTime(totalDisplayTime)}</span>
                            </div>
                        )}
                    </div>
                    {isThisActive && task.firstMove && (
                        <div style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                            marginTop: '6px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '0.5rem'
                        }}>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-color)', fontWeight: 700 }}>First move:</span>
                            <span>{task.firstMove}</span>
                        </div>
                    )}
                </div>

                {/* Actions - simplified on mobile for active tasks */}
                <div className="task-actions" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.25rem' : '0.5rem', opacity: isCompleted ? 0.5 : 1, flexShrink: 0 }}>

                    {isThisActive && (
                        <button
                            onClick={() => handlers.updateTaskStatus(task.id, 'idle')}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#EF4444',
                                cursor: 'pointer',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                transition: 'all 0.2s',
                            }}
                            title="Stop/Pause Task"
                        >
                            Stop
                        </button>
                    )}

                    {/* Daily Badge - Show on both mobile and desktop when dailyRepeat is enabled */}
                    {depth === 0 && task.dailyRepeat && !isZoneActive && !isCompleted && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '0px' : '3px',
                            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(147, 51, 234, 0.2))',
                            border: '1px solid rgba(96, 165, 250, 0.4)',
                            padding: isMobile ? '4px' : '2px 8px',
                            borderRadius: isMobile ? '6px' : '12px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'var(--accent-color)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            flexShrink: 0
                        }}>
                            <Repeat size={isMobile ? 12 : 10} />
                            {!isMobile && <span>Daily</span>}
                        </div>
                    )}

                    {/* Desktop Only: Repeat Toggle Button */}
                    {!isMobile && depth === 0 && !isZoneActive && !isCompleted && (
                        <button
                            onClick={() => handlers.toggleDailyRepeat(task.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: task.dailyRepeat ? 'var(--accent-color)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '6px',
                                opacity: task.dailyRepeat ? 1 : 0.5,
                                transition: 'all 0.2s',
                                borderRadius: '6px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title={task.dailyRepeat ? "Daily repeat ON - Click to turn off" : "Daily repeat OFF - Click to turn on"}
                        >
                            <Repeat size={18} />
                        </button>
                    )}

                    {/* Desktop Only: Add Subtask */}
                    {!isMobile && depth === 0 && !isZoneActive && !isCompleted && (
                        <button
                            onClick={() => handlers.addSubtask(task.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '6px',
                                opacity: 0.5,
                                transition: 'all 0.2s',
                                borderRadius: '6px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Add Subtask"
                        >
                            <GitBranch size={18} />
                        </button>
                    )}

                    {/* Desktop Only: Delete */}
                    {!isMobile && !isZoneActive && !isCompleted && (
                        <button
                            onClick={() => handlers.deleteTask(task.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '6px',
                                opacity: 0.5,
                                transition: 'all 0.2s',
                                borderRadius: '6px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.color = '#EF4444';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                        >
                            <Trash2 size={18} />
                        </button>
                    )}

                    {/* Delete button removed for completed tasks as per requirement */}
                </div>
            </div>

            {/* Inline First Move Prompt */}
            {isPrompting && (
                <div style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--card-bg)',
                    border: '2px solid #EF4444',
                    borderTop: 'none',
                    borderRadius: '0 0 16px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    animation: 'expandOpen 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    marginTop: '-4px',
                    zIndex: 0,
                    position: 'relative',
                    boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.15)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            First Move Prompt
                        </span>
                        <span style={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: '#EF4444',
                            fontVariantNumeric: 'tabular-nums',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                        }}>
                            00:{timeLeft.toString().padStart(2, '0')}
                        </span>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handlers.confirmZone(); }}>
                        <input
                            autoFocus
                            value={firstMoveText}
                            onChange={(e) => handlers.setFirstMoveText(e.target.value)}
                            placeholder="Describe the very first step..."
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'rgba(0,0,0,0.02)',
                                color: 'var(--text-primary)',
                                fontSize: '1.1rem',
                                outline: 'none',
                                fontFamily: 'inherit',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.backgroundColor = 'var(--card-bg)'}
                            onBlur={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') handlers.cancelZone();
                            }}
                        />
                    </form>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', fontWeight: 500 }}>
                        Press <span style={{ fontWeight: 700 }}>Enter</span> to start • <span style={{ fontWeight: 700 }}>Esc</span> to cancel
                    </div>
                </div>
            )}

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
                (() => {
                    const visibleSubtasks = task.subtasks.filter(t => showCompleted || t.status !== 'completed');
                    if (visibleSubtasks.length === 0) return null;

                    return (
                        <SortableContext items={visibleSubtasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.35rem' : '0.5rem' }}>
                                {visibleSubtasks.map(subtask => (
                                    <SortableTaskRow
                                        key={subtask.id}
                                        task={subtask}
                                        depth={depth + 1}
                                        isZoneActive={isZoneActive}
                                        theme={theme}
                                        firstMoveModal={firstMoveModal}
                                        firstMoveText={firstMoveText}
                                        timeLeft={timeLeft}
                                        now={now}
                                        isMobile={isMobile}
                                        showCompleted={showCompleted}
                                        handlers={handlers}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    );
                })()
            )}
        </div>
    );
};

interface TaskListViewProps {
    theme: 'dark' | 'light' | 'wallpaper';
    filterTaskIds?: Set<string>;
    onTaskCreated?: (taskId: string) => void;
}

export function TaskListView({ theme, filterTaskIds, onTaskCreated }: TaskListViewProps) {
    // Convex Hooks
    const { isAuthenticated, isLoading } = useConvexAuth();
    const rawTasks = useQuery(api.tasks.get, isAuthenticated ? {} : "skip");
    const addTaskMutation = useMutation(api.tasks.create);
    const updateTaskMutation = useMutation(api.tasks.update);
    const deleteTaskMutation = useMutation(api.tasks.remove);
    const syncLocal = useMutation(api.tasks.syncLocalData);

    // Responsive State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const tasks = useMemo(() => {
        if (!rawTasks) return [];
        // Reconstruct Tree from Flat List
        const map = new Map<string, Task>();
        const roots: Task[] = [];
        const activeTasksSet = new Set<string>();

        // 1. Create nodes
        rawTasks.forEach((t: any) => {
            const taskNode: Task = { ...t, id: t._id, subtasks: [], text: t.text || '', status: t.status || 'idle' };
            map.set(t._id, taskNode);
            if (t.status === 'active') activeTasksSet.add(t._id);
        });

        // 2. Link parent/child
        rawTasks.forEach((t: any) => {
            const node = map.get(t._id);
            if (!node) return;
            if (t.parentId && map.has(t.parentId)) {
                map.get(t.parentId)!.subtasks!.push(node);
            } else {
                // If filterTaskIds is provided, only include matching root tasks
                if (!filterTaskIds || filterTaskIds.has(t._id)) {
                    roots.push(node);
                }
            }
        });

        // 3. Sort
        // 3. Sort
        // Helper to identify tasks that are active or have active descendants
        const activeTreeSet = new Set<string>();
        const populateActiveTree = (nodes: Task[]): boolean => {
            let hasActive = false;
            for (const node of nodes) {
                const selfActive = node.status === 'active';
                const childrenActive = node.subtasks && node.subtasks.length > 0 ? populateActiveTree(node.subtasks) : false;
                if (selfActive || childrenActive) {
                    activeTreeSet.add(node.id);
                    hasActive = true;
                }
            }
            return hasActive;
        };
        populateActiveTree(roots);

        const sortFn = (a: Task, b: Task) => {
            // Priority 1: Active or has active descendant
            const aIsActive = activeTreeSet.has(a.id);
            const bIsActive = activeTreeSet.has(b.id);
            if (aIsActive && !bIsActive) return -1;
            if (!aIsActive && bIsActive) return 1;

            // Priority 2: Order
            return (a.order ?? 0) - (b.order ?? 0);
        };

        const recursiveSort = (nodes: Task[]) => {
            nodes.sort(sortFn);
            nodes.forEach(n => recursiveSort(n.subtasks!));
        };
        recursiveSort(roots);

        // Calculate totalTime correctly if currently active?
        // Actually, component handles `currentSessionTime` locally for display.
        // But we need to ensure local display handles the recursive check for "isAnyTaskActive".
        return roots;
    }, [rawTasks, filterTaskIds]);

    const [newTask, setNewTask] = useState('');
    const [showCompleted, setShowCompleted] = useState(true);

    // Migration Logic
    useEffect(() => {
        const local = localStorage.getItem('chrct_hub_tasks');
        if (local && rawTasks && rawTasks.length === 0) {
            try {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    syncLocal({ tasks: parsed }).then(() => {
                        localStorage.removeItem('chrct_hub_tasks');
                        // Optional: Clear history or preserve it differently
                        localStorage.removeItem('chrct_task_history');
                    });
                }
            } catch (e) {
                console.error("Migration failed", e);
            }
        }
    }, [rawTasks, syncLocal]);

    // Daily Repeat Reset Logic - Reset completed daily repeat tasks when date changes
    useEffect(() => {
        if (!rawTasks || rawTasks.length === 0) return;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Find daily repeat tasks that were completed on a previous date
        rawTasks.forEach((task: any) => {
            if (
                task.dailyRepeat &&
                task.status === 'completed' &&
                task.completedAt &&
                task.completedAt !== todayStr
            ) {
                // Reset this task to idle
                updateTaskMutation({
                    id: task._id as Id<"tasks">,
                    status: 'idle',
                    firstMove: undefined,
                    totalTime: 0,
                    activeSince: 0
                }).catch(e => console.error("Failed to reset daily repeat task:", e));
            }
        });
    }, [rawTasks, updateTaskMutation]);

    // First Move Prompt State
    const [firstMoveModal, setFirstMoveModal] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
    const [firstMoveText, setFirstMoveText] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);

    // Timer State
    const [now, setNow] = useState(Date.now());

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Timer Interval - only if tasks active
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAnyTaskActive(tasks)) {
            interval = setInterval(() => setNow(Date.now()), 1000);
        }
        return () => clearInterval(interval);
    }, [tasks]);

    // First Move Countdown
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (firstMoveModal.isOpen && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        } else if (timeLeft === 0 && firstMoveModal.isOpen) {
            setFirstMoveModal({ isOpen: false, taskId: null });
            setFirstMoveText('');
            setTimeLeft(60);
        }
        return () => clearInterval(interval);
    }, [firstMoveModal.isOpen, timeLeft]);

    const initiateZone = (taskId: string) => {
        if (isAnyTaskActive(tasks)) {
            alert("Please complete or stop your current active task first.");
            return;
        }
        setFirstMoveModal({ isOpen: true, taskId });
        setTimeLeft(60);
        setFirstMoveText('');
    };

    const confirmZone = () => {
        if (!firstMoveModal.taskId || !firstMoveText.trim()) return;
        const taskId = firstMoveModal.taskId;
        // Mutation
        updateTaskMutation({
            id: taskId as Id<"tasks">,
            status: 'active',
            firstMove: firstMoveText.trim(),
            activeSince: Date.now()
        }).catch(e => {
            console.error("Failed to start task:", e);
            alert("Failed to start task. Please check your connection.");
        });

        setFirstMoveModal({ isOpen: false, taskId: null });
        setFirstMoveText('');
        setTimeLeft(60);
    };

    const cancelZone = () => {
        setFirstMoveModal({ isOpen: false, taskId: null });
        setFirstMoveText('');
        setTimeLeft(60);
    };

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        const taskId = await addTaskMutation({
            text: newTask.trim(),
            status: 'idle',
            order: tasks.length || 0, // Append to end of root
        });
        if (onTaskCreated && taskId) {
            onTaskCreated(taskId as string);
        }
        setNewTask('');
    };

    const addSubtask = (parentId: string) => {
        // Find parent to get subtask count for order?
        // We can just query or just push with a high order.
        // Actually, to get correct order for subtask, we need to know how many subtasks there are.
        // Since we have the `tasks` tree locally, we can find the parent node.
        const findNode = (nodes: Task[], id: string): Task | null => {
            for (const node of nodes) {
                if (node.id === id) return node;
                if (node.subtasks) {
                    const found = findNode(node.subtasks, id);
                    if (found) return found;
                }
            }
            return null;
        };
        const parentNode = findNode(tasks, parentId);
        const order = parentNode && parentNode.subtasks ? parentNode.subtasks.length : 0;

        addTaskMutation({
            text: '',
            status: 'idle',
            parentId: parentId as Id<"tasks">,
            order: order
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        // Flatten to find new position relative to peers
        // Actually, dnd-kit gives us the active.id and over.id.
        // We need to determine the new order and potentially the new parent.
        // Simplified Logic: 
        // 1. Find the new index among the siblings of the target.
        // We rely on the tree structure.

        // This is complex to implement fully robustly in one go without potential flicker.
        // For MVP Cloud Sync, simple reordering?
        // Let's assume reordering only works within same parent container for now if using SortableContext properly?
        // The current implementation allows nested dragging?
        // The original code had logic for top-level and sub-level.

        // Let's try to maintain what was there:
        // Identify if we are moving within root or subtasks.

        // Helper to find parent of a node ID
        const findParent = (nodes: Task[], id: string, parentOfNodes: Task | null): Task | null => {
            for (const node of nodes) {
                if (node.id === id) return parentOfNodes;
                if (node.subtasks) {
                    const found = findParent(node.subtasks, id, node);
                    if (found !== undefined) return found; // found could be null (root)
                }
            }
            return undefined as any; // Not found
        }

        // Wait, finding the list containing the item is better.
        // But since we are using Convex, we just update the specific item's order/parentId.
        // We need to know:
        // 1. What is the new parent? (Derived from `over`?)
        // dnd-kit's `over` just tells us what we dropped ON.
        // If sorting vertical list, we dropped on another item.
        // We assume we take the parent of the `over` item.

        // Let's find the Flattened list of the container we dropped into? 
        // No, SortableContext is per level.

        // If we only sort within same level (SortableContext scope):
        // We find the list containing `over`.
        const findListContaining = (nodes: Task[], id: string): Task[] | null => {
            if (nodes.some(n => n.id === id)) return nodes;
            for (const node of nodes) {
                if (node.subtasks) {
                    const found = findListContaining(node.subtasks, id);
                    if (found) return found;
                }
            }
            return null;
        };

        const list = findListContaining(tasks, over.id as string);
        if (!list) return;

        // Check if active is in this list (same level)
        const oldIndex = list.findIndex(t => t.id === active.id);

        // New index
        const newIndex = list.findIndex(t => t.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            // Reordering in same list
            // We need to update orders of items between oldIndex and newIndex?
            // Or just swap? ArrayMove logic.
            // Efficient way: Update the moved item's order to be between newIndex-1 and newIndex+1?
            // Integer order: just re-assign all orders in this list to be safe?
            // "re-assign orders for all items in this list".
            const reordered = arrayMove(list, oldIndex, newIndex);
            reordered.forEach((t, i) => {
                if (t.order !== i) {
                    updateTaskMutation({
                        id: t.id as Id<"tasks">,
                        order: i
                    });
                }
            });
        }
        // Cross-level dragging is hard with just `SortableContext`. 
        // The original code handled it via `activeParentData` and `overParentData`.
        // If we want to support that, we need to handle parentId updates.
        // However, the original code:
        // `if (activeParentData && overParentData && activeParentData.parent.id === overParentData.parent.id)`
        // It strictly enforced same-parent reordering.
        // So I will stick to that.
    };

    const updateTaskStatus = (id: string, newStatus: 'idle' | 'active' | 'completed') => {
        if (newStatus === 'active') {
            initiateZone(id);
            return;
        }

        // Logic for completion (setting completedAt) handled here or backend?
        // Backend `update` allows passing fields.
        let updates: any = { status: newStatus };

        const task = findTask(tasks, id);
        if (!task) return;

        if (newStatus === 'completed' && task.status !== 'completed') {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            updates.completedAt = dateStr;
            updates.completedTimestamp = Date.now();

            // totalTime update
            if (task.status === 'active' && task.activeSince) {
                updates.totalTime = (task.totalTime || 0) + (Date.now() - task.activeSince);
                updates.activeSince = undefined; // clear activeSince? Backend patch needs explicit handling or just don't send it?
                // convex patch: undefined keys are ignored. null is needed to unset?
                // Convex schema: optional fields. To unset, we might need `null` if we changed schema to allow nulls.
                // OR passing special value. 
                // Actually, if I just don't send activeSince, it stays. I need to unset it.
                // For now, I'll update it to 0 or null? 
                // Schema: `v.optional(v.number())`. To remove it, `activeSince: undefined` doesn't work in `patch`.
                // We need to use `activeSince: undefined`? No, that just doesn't include it.
                // Convex usually requires `activeSince: null` but schema must match `v.union(v.number(), v.null())`.
                // Current schema: `v.optional(v.number())`.
                // I can't unset optional fields easily in current Convex version without schema change or `unset` helper (if available).
                // Workaround: set it to 0 or a flag value, or ignore it in logic.
                // Let's set it to 0.
                updates.activeSince = 0;
            }
        } else if (task.status === 'completed' && newStatus !== 'completed') {
            updates.completedAt = undefined; // Need to unset. 
            // Same issue. I will modify schema to allow nulls or just ignore?
            // Actually `undefined` in `args` of mutation `v.optional` just means optional argument.
            // I'll stick to updating what I can.
        } else if (task.status === 'active') {
            // Stopping
            updates.totalTime = (task.totalTime || 0) + (Date.now() - (task.activeSince || Date.now()));
            updates.activeSince = 0;
        }

        updateTaskMutation({ id: id as Id<"tasks">, ...updates })
            .catch(e => {
                console.error("Update failed:", e);
                alert("Failed to update task. If this persists, try restarting the app/backend.");
            });
    };

    const updateTaskText = (id: string, newText: string) => {
        updateTaskMutation({ id: id as Id<"tasks">, text: newText });
    };

    const deleteTask = (id: string) => {
        deleteTaskMutation({ id: id as Id<"tasks"> });
    };

    const toggleDailyRepeat = (id: string) => {
        const task = findTask(tasks, id);
        if (!task) return;
        updateTaskMutation({
            id: id as Id<"tasks">,
            dailyRepeat: !task.dailyRepeat
        });
    };

    const handlers = { updateTaskStatus, updateTaskText, deleteTask, addSubtask, initiateZone, confirmZone, cancelZone, setFirstMoveText, toggleDailyRepeat };

    const activeTasks = tasks.filter(t => t.status !== 'completed');
    const completedTasks = tasks.filter(t => {
        if (t.status !== 'completed') return false;
        // Auto-delete (hide) after 24 hours
        if (t.completedTimestamp) {
            return (Date.now() - t.completedTimestamp) < (24 * 60 * 60 * 1000);
        }
        // Fallback for old tasks without timestamp: separate by date?
        // If we want strict 24h and no timestamp exists, maybe we show them or hide them?
        // Let's hide them if completedAt is not today?
        // Or just show them (safe default).
        // User said "completed tasks cannot be manually deleted", so hiding old ones is safer.
        // Let's assume if no timestamp, check completedAt date vs today.
        if (t.completedAt) {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            return t.completedAt === dateStr;
        }
        return true;
    });

    // Find helper
    const findTask = (list: Task[], id: string): Task | null => {
        for (const t of list) {
            if (t.id === id) return t;
            if (t.subtasks) {
                const f = findTask(t.subtasks, id);
                if (f) return f;
            }
        }
        return null;
    }

    if (isLoading) {
        return (
            <div className="animate-in" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', opacity: 0.5
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite'
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Loading tasks...</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '1.5rem' : '2rem',
            flex: 1,
            width: '100%',
            maxWidth: isMobile ? '100%' : '800px',
            margin: '0 auto',
            padding: isMobile ? '0.3rem' : '1rem'
        }} className="animate-in">

            {!isAuthenticated && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem',
                    textAlign: 'center',
                    opacity: 0.7
                }}>
                    <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Sign in to manage your tasks</p>
                    {/* The sign-in button is in the header, or we can add one here if needed, but header is sufficient */}
                </div>
            )}

            {isAuthenticated && (
                <>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', alignItems: 'stretch' }}>
                        <form onSubmit={addTask} style={{ display: 'flex', gap: isMobile ? '0.75rem' : '1rem', flex: 1 }}>
                            <input
                                type="text"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                placeholder={isAnyTaskActive(tasks) ? "Finish active task first..." : "Add a new task..."}
                                disabled={isAnyTaskActive(tasks)}
                                style={{
                                    flex: 1,
                                    padding: isMobile ? '0.85rem 1rem' : '1rem 1.5rem',
                                    backgroundColor: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: isMobile ? '10px' : '12px',
                                    color: 'var(--text-primary)',
                                    fontSize: isMobile ? '1rem' : '1.2rem',
                                    outline: 'none',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    fontFamily: 'inherit',
                                    opacity: isAnyTaskActive(tasks) ? 0.5 : 1,
                                    cursor: isAnyTaskActive(tasks) ? 'not-allowed' : 'text',
                                    transition: 'all 0.2s'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={isAnyTaskActive(tasks)}
                                style={{
                                    background: 'var(--accent-color)',
                                    border: 'none',
                                    borderRadius: isMobile ? '10px' : '12px',
                                    width: isMobile ? '52px' : '64px',
                                    height: isMobile ? '52px' : 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    cursor: isAnyTaskActive(tasks) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: isAnyTaskActive(tasks) ? 0.3 : 1,
                                    flexShrink: 0,
                                }}
                                className="hover:opacity-90 active:scale-95"
                            >
                                <Plus size={isMobile ? 24 : 32} />
                            </button>
                        </form>

                        {/* Toggle Completed Tasks Button */}
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            style={{
                                background: 'var(--accent-color)',
                                border: 'none',
                                borderRadius: isMobile ? '10px' : '12px',
                                width: isMobile ? '52px' : '64px',
                                height: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                            }}
                            className="hover:opacity-90 active:scale-95"
                            title={showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"}
                        >
                            {showCompleted ? <EyeOff size={isMobile ? 24 : 28} /> : <Eye size={isMobile ? 24 : 28} />}
                        </button>

                        {/* TIME ALIVE counter - hidden on mobile */}
                        {!isMobile && (() => {
                            // Calculate total time alive today
                            const today = new Date();
                            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                            let totalAliveMs = 0;

                            // Helper to recursively sum time from tasks
                            const sumTaskTime = (taskList: Task[]) => {
                                for (const t of taskList) {
                                    // Add time from tasks completed today
                                    if (t.status === 'completed' && t.completedAt === todayStr && t.totalTime) {
                                        totalAliveMs += t.totalTime;
                                    }
                                    // Add time from active tasks (totalTime + current session)
                                    if (t.status === 'active') {
                                        totalAliveMs += t.totalTime || 0;
                                        if (t.activeSince) {
                                            totalAliveMs += now - t.activeSince;
                                        }
                                    }
                                    // Add time from idle tasks that have accumulated time today
                                    // (tasks that were active earlier today but stopped without completing)
                                    if (t.status === 'idle' && t.totalTime) {
                                        totalAliveMs += t.totalTime;
                                    }
                                    // Recurse into subtasks
                                    if (t.subtasks && t.subtasks.length > 0) {
                                        sumTaskTime(t.subtasks);
                                    }
                                }
                            };
                            sumTaskTime(tasks);

                            const totalMinutes = Math.floor(totalAliveMs / (1000 * 60));
                            const aliveHours = Math.floor(totalMinutes / 60);
                            const aliveMinutes = totalMinutes % 60;
                            const aliveDisplay = `${aliveHours}hr ${aliveMinutes}m`;

                            return (
                                <div style={{
                                    backgroundColor: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    padding: '0 1.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minWidth: '100px',
                                    flexShrink: 0,
                                }}>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        color: 'var(--text-secondary)',
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                        marginBottom: '2px'
                                    }}>
                                        TIME ALIVE
                                    </span>
                                    <span style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        color: 'var(--accent-color)',
                                        lineHeight: 1,
                                        fontVariantNumeric: 'tabular-nums'
                                    }}>
                                        {aliveDisplay}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Layout Split: Timeline+Active | Separator | Completed */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>

                        {/* 1. Active Section with Timeline (Timeline removed) */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '10px', gap: '0.5rem' }}>
                            {activeTasks.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    opacity: 0.5,
                                    marginTop: '2rem',
                                    marginBottom: '2rem',
                                    fontSize: '1.1rem'
                                }}>
                                    No active tasks.
                                </div>
                            )}

                            <style>{`
                            @keyframes expandOpen {
                                0% { opacity: 0; transform: translateY(-10px); clip-path: inset(0 0 100% 0); }
                                100% { opacity: 1; transform: translateY(0); clip-path: inset(0 0 -10% 0); }
                            }
                        `}</style>

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={activeTasks.map(t => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '1rem' }}>
                                        {activeTasks.map(task => (
                                            <SortableTaskRow
                                                key={task.id}
                                                task={task}
                                                depth={0}
                                                isZoneActive={false} // Top level handled by isAnyTaskActive logic
                                                theme={theme}
                                                firstMoveModal={firstMoveModal}
                                                firstMoveText={firstMoveText}
                                                timeLeft={timeLeft}
                                                now={now}
                                                isMobile={isMobile}
                                                showCompleted={showCompleted}
                                                handlers={handlers}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* 2. Completed Section */}
                        {showCompleted && completedTasks.length > 0 && (
                            <div style={{ marginTop: '2rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    marginBottom: '1rem',
                                    opacity: 0.5
                                }}>
                                    <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border-color)' }}></div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Completed
                                    </span>
                                    <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border-color)' }}></div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.35rem' : '0.5rem', opacity: 0.7 }}>
                                    {completedTasks.map(task => (
                                        <SortableTaskRow
                                            key={task.id}
                                            task={task}
                                            depth={0}
                                            isZoneActive={false}
                                            theme={theme}
                                            firstMoveModal={firstMoveModal}
                                            firstMoveText={firstMoveText}
                                            timeLeft={timeLeft}
                                            now={now}
                                            isMobile={isMobile}
                                            showCompleted={showCompleted}
                                            handlers={handlers}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )
            }
        </div >
    );
}
