import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface ChainTemplate {
    id: string; // This will map to _id from Convex
    name: string;
    tasks: { name: string; duration: number }[];
}

interface ChainTask {
    id: string;
    name: string;
    duration: number; // seconds
    status: 'pending' | 'active' | 'completed';
}

interface TaskChainContextType {
    tasks: ChainTask[];
    timeRemaining: number;
    isRunning: number;

    activeTask: ChainTask | undefined;
    activeIndex: number;
    completedTasks: ChainTask[];
    pendingTasks: ChainTask[];
    isChainComplete: boolean;
    hasChainStarted: boolean;
    progress: number;
    totalRemaining: number;

    // Actions
    addTask: (name: string) => void;
    removeTask: (id: string) => void;
    adjustDuration: (id: string, delta: number) => void;
    startChain: () => void;
    togglePause: () => void;
    skipTask: () => void;
    resetChain: () => void;
    clearAll: () => void;

    // Templates
    templates: ChainTemplate[];
    saveTemplate: (name: string) => void;
    loadTemplate: (template: ChainTemplate) => void;
    deleteTemplate: (id: string) => void;

    isRunningState: boolean;
}


const TaskChainContext = createContext<TaskChainContextType | undefined>(undefined);

export const useTaskChain = () => {
    const context = useContext(TaskChainContext);
    if (!context) {
        throw new Error('useTaskChain must be used within a TaskChainProvider');
    }
    return context;
};

export const TaskChainProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

    // --- Convex Templates ---
    const convexTemplates = useQuery(api.chainTemplates.get);
    const createTemplate = useMutation(api.chainTemplates.create);
    const removeTemplate = useMutation(api.chainTemplates.remove);

    const templates: ChainTemplate[] = (convexTemplates || []).map((t: any) => ({
        id: t._id,
        name: t.name,
        tasks: t.tasks
    }));

    // Ref to avoid stale closure in effects
    // Tracks whether the timer has actually been started and ticked
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

        const idx = tasks.findIndex(t => t.status === 'active');
        if (idx === -1) return;

        const finished = tasks[idx];
        const next = tasks[idx + 1];

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
    }, [timeRemaining, isRunning, sendNotification, tasks]);

    // --- Handlers ---
    const addTask = (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        setTasks(prev => [...prev, {
            id: Date.now().toString(),
            name: trimmed,
            duration: 300, // 5 min default
            status: 'pending' as const,
        }]);
    };

    const removeTask = (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const adjustDuration = (id: string, delta: number) => {
        setTasks(prev => prev.map(t => {
            if (t.id === id && t.status === 'active') {
                return t;
            }
            if (t.id === id && t.status !== 'completed') {
                return { ...t, duration: Math.max(60, t.duration + delta) };
            }
            return t;
        }));

        const task = tasks.find(t => t.id === id);
        if (task && task.status === 'active') {
            setTimeRemaining(prev => Math.max(60, prev + delta));
        }
    };

    const startChain = () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const firstPendingIdx = tasks.findIndex(t => t.status === 'pending');
        if (firstPendingIdx === -1) return;

        const firstDuration = tasks[firstPendingIdx].duration;
        hasTimerStartedRef.current = false;
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

    const saveTemplate = async (name: string) => {
        if (!name || tasks.length === 0) return;

        await createTemplate({
            name,
            tasks: tasks.map(t => ({ name: t.name, duration: t.duration }))
        });
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

    const deleteTemplate = async (id: string) => {
        await removeTemplate({ id: id as Id<"chainTemplates"> });
    };

    return (
        <TaskChainContext.Provider value={{
            tasks,
            timeRemaining,
            isRunning: isRunning ? 1 : 0,
            isRunningState: isRunning,
            activeTask,
            activeIndex,
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
        }}>
            {children}
        </TaskChainContext.Provider>
    );
};
