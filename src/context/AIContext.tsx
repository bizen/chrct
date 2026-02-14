import { createContext, useContext, useState, type ReactNode, useRef } from 'react';
import { useAction, useMutation, useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface AIContextType {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    proposedSubtasks: string[];
    isGenerating: boolean;
    targetTaskName: string;
    targetSuperGoalId: string | null;
    createdParentTaskId: string | null;
    setCreatedParentTaskId: (id: string | null) => void;
    ensureParentTask: () => Promise<string | null>;
    deconstruct: (taskName: string, superGoalId: string | null, existingTaskId?: string | null) => Promise<void>;
    acceptTask: (taskName: string) => Promise<void>;
    acceptAll: () => Promise<void>;
    clearProposals: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [proposedSubtasks, setProposedSubtasks] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [targetTaskName, setTargetTaskName] = useState('');
    const [targetSuperGoalId, setTargetSuperGoalId] = useState<string | null>(null);
    const [createdParentTaskId, setCreatedParentTaskId] = useState<string | null>(null);
    const parentCreationPromiseRef = useRef<Promise<string> | null>(null);

    const { isAuthenticated } = useConvexAuth();
    const superGoals = useQuery(api.superGoals.get, isAuthenticated ? {} : "skip") || [];

    const deconstructAction = useAction(api.ai.deconstructTask);
    const addTaskMutation = useMutation(api.tasks.create);
    const updateSuperGoalMutation = useMutation(api.superGoals.update);

    const ensureParentTask = async (): Promise<string | null> => {
        // If already created, return it
        if (createdParentTaskId) return createdParentTaskId;
        // If creation in progress, return existing promise
        if (parentCreationPromiseRef.current) return parentCreationPromiseRef.current;
        // If no target task name, cannot create
        if (!targetTaskName) return null;

        const promise = (async () => {
            try {
                const newParentId = await addTaskMutation({
                    text: targetTaskName,
                    status: 'idle',
                    order: 9999,
                });

                if (newParentId) {
                    setCreatedParentTaskId(newParentId);

                    // Link to Super Goal
                    if (targetSuperGoalId) {
                        const targetSG = superGoals.find((sg: any) => sg._id === targetSuperGoalId);
                        if (targetSG) {
                            try {
                                await updateSuperGoalMutation({
                                    id: targetSG._id,
                                    bigGoalIds: [...(targetSG.bigGoalIds || []), newParentId]
                                });
                            } catch (linkError) {
                                console.error("[AIContext] Failed to link new task to Super Goal:", linkError);
                            }
                        }
                    }
                    return newParentId;
                }
                throw new Error("Failed to create parent task");
            } catch (e) {
                console.error("[AIContext] Parent creation failed:", e);
                parentCreationPromiseRef.current = null;
                throw e;
            }
        })();

        parentCreationPromiseRef.current = promise;
        return promise;
    };

    const deconstruct = async (taskName: string, superGoalId: string | null, existingTaskId: string | null = null) => {
        if (!taskName.trim()) return;
        setIsOpen(true);
        setIsGenerating(true);
        setTargetTaskName(taskName);
        setTargetSuperGoalId(superGoalId);

        // If we have an existing task, use it as the parent immediately
        setCreatedParentTaskId(existingTaskId);

        parentCreationPromiseRef.current = null; // Reset promise lock
        setProposedSubtasks([]);

        try {
            const result = await deconstructAction({ taskName });
            setProposedSubtasks(result);
        } catch (error) {
            console.error("Deconstruction failed:", error);
            setProposedSubtasks(["Failed to generate subtasks. Please try again."]);
        } finally {
            setIsGenerating(false);
        }
    };

    // These defaults will be overridden by the Consumer (RightHub) or we implement here.
    // Let's implement here but we need a callback for "onAdd" because we lack SuperGoal data here.
    // Actually, `RightHub` is the better place for the mutation logic involving reading SuperGoals.
    // So `AIContext` primarily holds the data.

    const clearProposals = () => {
        setProposedSubtasks([]);
        setTargetTaskName('');
        setTargetSuperGoalId(null);
        setCreatedParentTaskId(null);
        parentCreationPromiseRef.current = null;
    };

    return (
        <AIContext.Provider value={{
            isOpen,
            setIsOpen,
            proposedSubtasks,
            isGenerating,
            targetTaskName,
            targetSuperGoalId, // Added this
            createdParentTaskId,
            setCreatedParentTaskId,
            ensureParentTask,
            deconstruct,
            acceptTask: async () => { }, // Placeholder, implemented in Right Hub or via separate logic
            acceptAll: async () => { }, // Placeholder
            clearProposals
        }}>
            {children}
        </AIContext.Provider>
    );
}

export function useAI() {
    const context = useContext(AIContext);
    if (context === undefined) {
        throw new Error('useAI must be used within a AIProvider');
    }
    return context;
}
