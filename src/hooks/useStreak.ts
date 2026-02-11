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

export const useStreak = (isLicenseActive: boolean = true) => {
    const { isAuthenticated } = useConvexAuth();
    const skipQuery = !isAuthenticated || !isLicenseActive;
    const tasks = useQuery(api.tasks.get, skipQuery ? "skip" : {}) || [];

    const { streak, isCompletedToday, dailyProgress, history, weeklyHours } = useMemo(() => {
        // Build history map from completed tasks
        const historyMap: Record<string, number> = {};

        // Weekly Calculation (Last 7 Days)
        const now = new Date();
        const startOfPeriod = new Date(now);
        startOfPeriod.setDate(startOfPeriod.getDate() - 6); // 7 days window including today
        startOfPeriod.setHours(0, 0, 0, 0);

        let weeklyMs = 0;

        tasks.forEach((t: any) => {
            // 1. Streak History Map
            if (t.status === 'completed' && t.completedAt) {
                historyMap[t.completedAt] = (historyMap[t.completedAt] || 0) + 1;
            }

            // 2. Weekly Hours Calculation
            // Add time from tasks completed IN THE LAST 7 DAYS
            if (t.status === 'completed' && t.completedAt && t.totalTime) {
                const completedDate = new Date(t.completedAt);
                // Reset completedDate time to ensure comparison by date
                completedDate.setHours(0, 0, 0, 0);

                if (completedDate >= startOfPeriod) {
                    weeklyMs += t.totalTime;
                }
            } else if (t.status !== 'completed' && t.totalTime) {
                // Add time from ALL active/idle tasks (assuming they are current)
                weeklyMs += t.totalTime;
            }

            // Add currently elapsed active time
            if (t.status === 'active' && t.activeSince) {
                weeklyMs += (Date.now() - t.activeSince);
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

        const weeklyHrs = Math.floor(weeklyMs / (1000 * 60 * 60)); // Integer hours

        return {
            streak: currentStreak,
            isCompletedToday: completedToday,
            dailyProgress: tasksToday,
            history: historyMap,
            weeklyHours: weeklyHrs
        };
    }, [tasks]);

    return { streak, isCompletedToday, dailyProgress, history, weeklyHours };
};
