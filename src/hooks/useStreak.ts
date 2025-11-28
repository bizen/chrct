import { useState, useEffect } from 'react';

interface StreakState {
    currentStreak: number;
    lastContributionDate: string | null;
}

export const useStreak = (characterCount: number) => {
    const [streak, setStreak] = useState<number>(0);
    const [isCompletedToday, setIsCompletedToday] = useState<boolean>(false);
    const [startCount, setStartCount] = useState<number | null>(null);

    // Helper to get today's date string (YYYY-MM-DD) in local time
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        // Load initial state
        const storedStreak = localStorage.getItem('chrct_streak');
        const storedDate = localStorage.getItem('chrct_last_contribution');
        const today = getTodayString();

        let currentStreak = storedStreak ? parseInt(storedStreak, 10) : 0;

        if (storedDate === today) {
            setIsCompletedToday(true);
        } else {
            setIsCompletedToday(false);
            // Check for broken streak on load
            if (storedDate) {
                const lastDate = new Date(storedDate);
                const nowDate = new Date(today);
                const diffTime = Math.abs(nowDate.getTime() - lastDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 1) {
                    currentStreak = 0; // Reset visual streak if broken
                }
            }
        }
        setStreak(currentStreak);

        // Initialize daily start count
        const storedStartDate = localStorage.getItem('chrct_today_start_date');
        const storedStartCount = localStorage.getItem('chrct_today_start_count');

        if (storedStartDate !== today) {
            // New day, reset start count to current
            localStorage.setItem('chrct_today_start_date', today);
            localStorage.setItem('chrct_today_start_count', characterCount.toString());
            setStartCount(characterCount);
        } else {
            // Same day, load stored start count
            if (storedStartCount) {
                setStartCount(parseInt(storedStartCount, 10));
            } else {
                // Fallback if date exists but count missing (e.g., first load after update)
                localStorage.setItem('chrct_today_start_count', characterCount.toString());
                setStartCount(characterCount);
            }
        }
    }, []); // Run once on mount. Note: characterCount here is initial value.

    useEffect(() => {
        if (isCompletedToday || startCount === null) return;

        const today = getTodayString();
        const storedDate = localStorage.getItem('chrct_last_contribution');

        // If already completed today, ensure state reflects it and stop
        if (storedDate === today) {
            if (!isCompletedToday) setIsCompletedToday(true);
            return;
        }

        // Check if net increase is >= 100
        if (characterCount - startCount >= 100) {
            let currentStreak = streak;

            if (storedDate) {
                const lastDate = new Date(storedDate);
                const nowDate = new Date(today);
                const diffTime = Math.abs(nowDate.getTime() - lastDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentStreak += 1;
                } else if (diffDays > 1) {
                    currentStreak = 1; // Reset and start new
                } else {
                    // Same day? Should be caught by first check, but just in case
                }
            } else {
                currentStreak = 1;
            }

            setStreak(currentStreak);
            setIsCompletedToday(true);
            localStorage.setItem('chrct_streak', currentStreak.toString());
            localStorage.setItem('chrct_last_contribution', today);
        }
    }, [characterCount, startCount, isCompletedToday, streak]);

    const dailyProgress = startCount !== null ? Math.max(0, characterCount - startCount) : 0;

    return { streak, isCompletedToday, dailyProgress };
};
