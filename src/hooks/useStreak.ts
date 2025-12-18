import { useState, useEffect } from 'react';

export const useStreak = () => {
    const [streak, setStreak] = useState<number>(0);
    const [isCompletedToday, setIsCompletedToday] = useState<boolean>(false);
    // dailyProgress will now represent tasks completed today
    const [dailyProgress, setDailyProgress] = useState<number>(0);

    // Helper to get today's date string (YYYY-MM-DD) in local time
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const calculateStreak = () => {
        const historyStr = localStorage.getItem('chrct_task_history');
        const history: Record<string, number> = historyStr ? JSON.parse(historyStr) : {};
        const today = getTodayString();

        // Calculate today's progress
        const tasksToday = history[today] || 0;
        setDailyProgress(tasksToday);

        const completedToday = tasksToday > 0;
        setIsCompletedToday(completedToday);

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
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            if (history[dateStr] && history[dateStr] > 0) {
                currentStreak++;
                date.setDate(date.getDate() - 1);
            } else {
                break;
            }
        }

        setStreak(currentStreak);
    };

    useEffect(() => {
        // Initial calculation
        calculateStreak();

        // Listen for task updates
        const handleTaskUpdate = () => {
            calculateStreak();
        };

        window.addEventListener('chrct-task-update', handleTaskUpdate);

        // Also check on visibility change (in case user comes back next day without reload)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                calculateStreak();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('chrct-task-update', handleTaskUpdate);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return { streak, isCompletedToday, dailyProgress };
};
