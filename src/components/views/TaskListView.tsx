import { useState, useEffect } from 'react';
import { Plus, Check, Trash2, GitBranch, GripVertical, Clock } from 'lucide-react';
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

interface Task {
    id: number;
    text: string;
    // Status can be: 'idle' (default), 'active' (in zone), 'completed'
    status: 'idle' | 'active' | 'completed';
    completedAt?: string;
    firstMove?: string;
    subtasks?: Task[];
    totalTime?: number; // Accumulated time in ms
    activeSince?: number; // Timestamp when current session started
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

// Recursive helpters
const isAnyTaskActive = (tasks: Task[]): boolean => {
    return tasks.some(t => t.status === 'active' || (t.subtasks && isAnyTaskActive(t.subtasks)));
};

const updateTaskInTree = (tasks: Task[], id: number, updater: (t: Task) => Task): Task[] => {
    return tasks.map(t => {
        if (t.id === id) return updater(t);
        if (t.subtasks) return { ...t, subtasks: updateTaskInTree(t.subtasks, id, updater) };
        return t;
    });
};

const addSubtaskInTree = (tasks: Task[], parentId: number, newSubtask: Task): Task[] => {
    return tasks.map(t => {
        if (t.id === parentId) return { ...t, subtasks: [...(t.subtasks || []), newSubtask] };
        if (t.subtasks) return { ...t, subtasks: addSubtaskInTree(t.subtasks, parentId, newSubtask) };
        return t;
    });
};

const deleteTaskInTree = (tasks: Task[], id: number): Task[] => {
    return tasks.filter(t => t.id !== id).map(t => ({
        ...t,
        subtasks: t.subtasks ? deleteTaskInTree(t.subtasks, id) : undefined
    }));
};

interface TaskRowProps {
    task: Task;
    depth: number;
    isZoneActive: boolean;
    theme: 'dark' | 'light' | 'wallpaper';
    firstMoveModal: { isOpen: boolean; taskId: number | null };
    firstMoveText: string;
    timeLeft: number;
    now: number;
    handlers: {
        updateTaskStatus: (id: number, status: 'idle' | 'active' | 'completed') => void;
        updateTaskText: (id: number, text: string) => void;
        deleteTask: (id: number) => void;
        addSubtask: (parentId: number) => void;
        initiateZone: (id: number) => void;
        confirmZone: () => void;
        cancelZone: () => void;
        setFirstMoveText: (text: string) => void;
    };
}

const SortableTaskRow = (props: TaskRowProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 999 : (props.firstMoveModal.isOpen && props.firstMoveModal.taskId === props.task.id) || props.task.status === 'active' ? 100 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <TaskContent {...props} dragHandleAttributes={attributes} dragHandleListeners={listeners} />
        </div>
    );
};

const TaskContent = ({
    task, depth, isZoneActive, theme, firstMoveModal, firstMoveText, timeLeft, now, handlers,
    dragHandleAttributes, dragHandleListeners
}: TaskRowProps & { dragHandleAttributes?: any, dragHandleListeners?: any }) => {
    const isThisActive = task.status === 'active';
    const isDisabled = isZoneActive && !isThisActive && task.status !== 'completed';
    const isPrompting = firstMoveModal.isOpen && firstMoveModal.taskId === task.id;
    const isCompleted = task.status === 'completed';

    const currentSessionTime = isThisActive && task.activeSince ? (now - task.activeSince) : 0;
    const totalDisplayTime = (task.totalTime || 0) + currentSessionTime;
    const hasTime = totalDisplayTime > 0;

    return (
        <div
            className="group"
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem', // Consistent gap for children (subtasks list) relative to row content? No, wrapper usually contains Row + Subtasks.
                // If I use gap here, it puts space between Row and Subtasks.
                marginLeft: depth > 0 ? `${depth * 1.5}rem` : '0',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                // Margin bottom removed to let parent container control spacing via gap
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    position: 'relative',
                    borderRadius: isPrompting ? '16px 16px 0 0' : '16px',
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
                    transform: isThisActive ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isThisActive
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 5px 10px -5px rgba(0, 0, 0, 0.1)'
                        : (isCompleted ? 'none' : '0 1px 3px rgba(0,0,0,0.05)'),
                }}
            >
                {/* Drag Handle */}
                {!isZoneActive && !isCompleted && (
                    <div
                        {...dragHandleAttributes}
                        {...dragHandleListeners}
                        style={{
                            cursor: 'grab',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--text-secondary)',
                            opacity: 0.3,
                            marginRight: '-0.25rem',
                            transition: 'opacity 0.2s',
                        }}
                        title="Drag to reorder"
                        className="hover:opacity-100"
                    >
                        <GripVertical size={20} />
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
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy
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
                        <input
                            value={task.text}
                            onChange={(e) => handlers.updateTaskText(task.id, e.target.value)}
                            disabled={isCompleted}
                            style={{
                                fontSize: '1.2rem',
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                                fontWeight: isThisActive ? 600 : 400,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                flex: 1,
                                fontFamily: 'inherit',
                                padding: 0,
                                margin: 0,
                                transition: 'color 0.2s',
                                width: '100%',
                            }}
                        />
                        {/* Timer Display */}
                        {(hasTime || isThisActive) && (
                            <div style={{
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

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isCompleted ? 0.5 : 1 }}>

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

                    {depth === 0 && !isZoneActive && !isCompleted && (
                        <button // Add Subtask
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

                    {!isZoneActive && !isCompleted && ( // Delete - only for editing flow
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
                    {/* For completed tasks, show a subtle restore/delete or just delete? User didn't specify, but usually delete is needed. Keeping cleanup simple. */}
                    {isCompleted && (
                        <button
                            onClick={() => handlers.deleteTask(task.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '6px',
                                opacity: 0.3,
                                transition: 'all 0.2s',
                            }}
                            className="hover:opacity-100"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
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
                <SortableContext items={task.subtasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {/* Consistent gap, removed marginTop */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {task.subtasks.map(subtask => (
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
                                handlers={handlers}
                            />
                        ))}
                    </div>
                </SortableContext>
            )}
        </div>
    );
};

export function TaskListView({ theme }: { theme: 'dark' | 'light' | 'wallpaper' }) {
    const [tasks, setTasks] = useState<Task[]>(() => {
        const saved = localStorage.getItem('chrct_hub_tasks');
        const initialTasks = saved ? JSON.parse(saved) : [];
        return initialTasks.map((t: any) => ({
            ...t,
            status: t.status || (t.completed ? 'completed' : 'idle'),
            subtasks: t.subtasks || [],
            totalTime: t.totalTime || 0,
            activeSince: t.status === 'active' ? (t.activeSince || Date.now()) : undefined
        }));
    });
    const [newTask, setNewTask] = useState('');

    // First Move Prompt State
    const [firstMoveModal, setFirstMoveModal] = useState<{ isOpen: boolean; taskId: number | null }>({ isOpen: false, taskId: null });
    const [firstMoveText, setFirstMoveText] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);

    // Timer State
    const [now, setNow] = useState(Date.now());

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        localStorage.setItem('chrct_hub_tasks', JSON.stringify(tasks));
        window.dispatchEvent(new Event('chrct-task-update'));
    }, [tasks]);

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

    const initiateZone = (taskId: number) => {
        if (isAnyTaskActive(tasks)) return;
        setFirstMoveModal({ isOpen: true, taskId });
        setTimeLeft(60);
        setFirstMoveText('');
    };

    const confirmZone = () => {
        if (!firstMoveModal.taskId || !firstMoveText.trim()) return;
        setTasks(prev => updateTaskInTree(prev, firstMoveModal.taskId!, t => ({
            ...t,
            status: 'active',
            firstMove: firstMoveText.trim(),
            activeSince: Date.now(),
            totalTime: t.totalTime || 0
        })));
        setFirstMoveModal({ isOpen: false, taskId: null });
        setFirstMoveText('');
        setTimeLeft(60);
    };

    const cancelZone = () => {
        setFirstMoveModal({ isOpen: false, taskId: null });
        setFirstMoveText('');
        setTimeLeft(60);
    };

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: newTask.trim(), status: 'idle', subtasks: [], totalTime: 0 }]);
        setNewTask('');
    };

    const addSubtask = (parentId: number) => {
        setTasks(prev => addSubtaskInTree(prev, parentId, {
            id: Date.now(),
            text: '',
            status: 'idle',
            subtasks: [],
            totalTime: 0
        }));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        // Use full list for top-level moves
        const currentTasks = [...tasks];

        // 1. Try to reorder top-level
        const activeIndexTop = currentTasks.findIndex(t => t.id === active.id);
        const overIndexTop = currentTasks.findIndex(t => t.id === over.id);

        if (activeIndexTop !== -1 && overIndexTop !== -1) {
            setTasks(arrayMove(currentTasks, activeIndexTop, overIndexTop));
            return;
        }

        // 2. Try to reorder subtasks
        const findParent = (list: Task[], targetId: number): { list: Task[], parent: Task } | null => {
            for (const t of list) {
                if (t.subtasks) {
                    const foundInSub = t.subtasks.find(sub => sub.id === targetId);
                    if (foundInSub) return { list: t.subtasks, parent: t };
                    const recursiveResult = findParent(t.subtasks, targetId);
                    if (recursiveResult) return recursiveResult;
                }
            }
            return null;
        }

        const activeParentData = findParent(currentTasks, Number(active.id));
        const overParentData = findParent(currentTasks, Number(over.id));

        if (activeParentData && overParentData && activeParentData.parent.id === overParentData.parent.id) {
            const parentId = activeParentData.parent.id;
            const subtaskList = activeParentData.list;
            const oldIndex = subtaskList.findIndex(t => t.id === Number(active.id));
            const newIndex = subtaskList.findIndex(t => t.id === Number(over.id));

            if (oldIndex !== -1 && newIndex !== -1) {
                const newSubtasks = arrayMove(subtaskList, oldIndex, newIndex);
                setTasks(prev => updateTaskInTree(prev, parentId, t => ({ ...t, subtasks: newSubtasks })));
            }
        }
    };

    const updateTaskStatus = (id: number, newStatus: 'idle' | 'active' | 'completed') => {
        if (newStatus === 'active') {
            initiateZone(id);
            return;
        }
        setTasks(prev => updateTaskInTree(prev, id, (t) => {
            let newTotalTime = t.totalTime || 0;
            if (t.status === 'active' && t.activeSince) {
                newTotalTime += (Date.now() - t.activeSince);
            }

            if (newStatus === 'completed' && t.status !== 'completed') {
                const today = new Date();
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                // History update
                const history = JSON.parse(localStorage.getItem('chrct_task_history') || '{}');
                history[dateStr] = (history[dateStr] || 0) + 1;
                localStorage.setItem('chrct_task_history', JSON.stringify(history));
                window.dispatchEvent(new Event('chrct-task-update'));

                return { ...t, status: 'completed', completedAt: dateStr, totalTime: newTotalTime, activeSince: undefined };
            } else if (t.status === 'completed' && newStatus !== 'completed') {
                const history = JSON.parse(localStorage.getItem('chrct_task_history') || '{}');
                const targetDate = t.completedAt || new Date().toISOString().split('T')[0];
                if (history[targetDate] && history[targetDate] > 0) history[targetDate] -= 1;
                localStorage.setItem('chrct_task_history', JSON.stringify(history));
                window.dispatchEvent(new Event('chrct-task-update'));
                return { ...t, status: newStatus, completedAt: undefined, totalTime: newTotalTime, activeSince: undefined };
            }
            return { ...t, status: newStatus, totalTime: newTotalTime, activeSince: undefined };
        }));
    };

    const updateTaskText = (id: number, newText: string) => setTasks(prev => updateTaskInTree(prev, id, t => ({ ...t, text: newText })));
    const deleteTask = (id: number) => setTasks(prev => deleteTaskInTree(prev, id));

    const handlers = { updateTaskStatus, updateTaskText, deleteTask, addSubtask, initiateZone, confirmZone, cancelZone, setFirstMoveText };

    const activeTasks = tasks.filter(t => t.status !== 'completed');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            flex: 1,
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            padding: '1rem'
        }} className="animate-in">

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
                <form onSubmit={addTask} style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                    <input
                        type="text"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder={isAnyTaskActive(tasks) ? "Finish active task first..." : "Add a new task..."}
                        disabled={isAnyTaskActive(tasks)}
                        style={{
                            flex: 1,
                            padding: '1rem 1.5rem',
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            color: 'var(--text-primary)',
                            fontSize: '1.2rem',
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
                            borderRadius: '12px',
                            width: '64px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            cursor: isAnyTaskActive(tasks) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: isAnyTaskActive(tasks) ? 0.3 : 1,
                        }}
                        className="hover:opacity-90 active:scale-95"
                    >
                        <Plus size={32} />
                    </button>
                </form>

                <div style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '0 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minWidth: '80px',
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
                        GRAND TASKS
                    </span>
                    <span style={{
                        fontSize: '1.8rem',
                        fontWeight: 700,
                        color: 'var(--accent-color)',
                        lineHeight: 1
                    }}>
                        {activeTasks.length}
                    </span>
                </div>
            </div>

            {/* Layout Split: Timeline+Active | Separator | Completed */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>

                {/* 1. Active Section with Timeline */}
                <div style={{ display: 'flex', gap: '1rem', position: 'relative', minHeight: activeTasks.length > 0 ? '50px' : '0' }}>

                    {/* Timeline Container - Flex column to hold labels and bar */}
                    <div style={{
                        display: activeTasks.length > 0 ? 'flex' : 'none',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '24px', // Reserve width for text (AM/PM)
                        flexShrink: 0,
                        marginTop: '10px',
                        marginBottom: '10px'
                    }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>AM</div>
                        <div style={{
                            width: '6px',
                            flex: 1,
                            borderRadius: '4px',
                            background: 'linear-gradient(to bottom, #7DD3FC 0%, #E0F7FA 30%, #a78bfa 70%, #4338ca 100%)',
                        }} />
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>PM</div>
                    </div>

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
                                {activeTasks.map((task) => (
                                    <SortableTaskRow
                                        key={task.id}
                                        task={task}
                                        depth={0}
                                        isZoneActive={isAnyTaskActive(tasks)}
                                        theme={theme}
                                        firstMoveModal={firstMoveModal}
                                        firstMoveText={firstMoveText}
                                        timeLeft={timeLeft}
                                        now={now}
                                        handlers={handlers}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>

                {/* 2. Completed Section (Full separate block) */}
                {completedTasks.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingLeft: 'calc(24px + 1rem + 10px)' /* Align with active list text implicitly or just offset */ }}>
                        <div style={{
                            height: '2px',
                            backgroundColor: 'var(--border-color)',
                            margin: '1rem 0 2rem 0',
                            opacity: 0.5,
                            borderRadius: '2px'
                        }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.7 }}>
                            {completedTasks.map((task) => (
                                <TaskContent
                                    key={task.id}
                                    task={task}
                                    depth={0}
                                    isZoneActive={isAnyTaskActive(tasks)}
                                    theme={theme}
                                    firstMoveModal={firstMoveModal}
                                    firstMoveText={firstMoveText}
                                    timeLeft={timeLeft}
                                    now={now}
                                    handlers={handlers}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
