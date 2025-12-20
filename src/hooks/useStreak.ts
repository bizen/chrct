import { useMemo } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Helper to get date string (YYYY-MM-DD) from a Date object
const getDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const useStreak = () => {
    const { isAuthenticated } = useConvexAuth();
    const tasks = useQuery(api.tasks.get, isAuthenticated ? {} : "skip") || [];

    const { streak, isCompletedToday, dailyProgress, history } = useMemo(() => {
        // Build history map from completed tasks
        const historyMap: Record<string, number> = {};

        tasks.forEach((t: any) => {
            if (t.status === 'completed' && t.completedAt) {
                historyMap[t.completedAt] = (historyMap[t.completedAt] || 0) + 1;
            }
        });

        const today = getDateString(new Date());

        // Calculate today's progress
        const tasksToday = historyMap[today] || 0;
        const completedToday = tasksToday > 0;

        // Calculate streak
        let currentStreak = 0;
        let date = new Date();

        // If completed today, start counting from today. 
        // If not, start counting from yesterday to check if streak is alive.
        if (!completedToday) {
            date.setDate(date.getDate() - 1);
        }

        // Loop backwards
        while (true) {
            const dateStr = getDateString(date);

            if (historyMap[dateStr] && historyMap[dateStr] > 0) {
                currentStreak++;
                date.setDate(date.getDate() - 1);
            } else {
                break;
            }
        }

        return {
            streak: currentStreak,
            isCompletedToday: completedToday,
            dailyProgress: tasksToday,
            history: historyMap
        };
    }, [tasks]);

    return { streak, isCompletedToday, dailyProgress, history };
};
