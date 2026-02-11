export interface SuperGoal {
    id: string;
    text: string;
    description?: string;
    bigGoalIds: string[]; // IDs of root-level tasks (Big Goals) associated with this Super Goal
    createdAt: number;
    color?: string; // Optional accent color
}

// Re-export existing Task interface if needed, or define shared types here
