

interface TaskCommitWidgetProps {
    theme: 'dark' | 'light' | 'wallpaper';
    historyData?: Record<string, number>;
}

export function TaskCommitWidget({ theme, historyData = {} }: TaskCommitWidgetProps) {
    const history = historyData;

    const getIntensityColor = (count: number) => {
        if (count === 0) return theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        // Light Blue Theme
        if (count >= 5) return '#0EA5E9'; // Sky 500
        if (count >= 3) return '#38BDF8'; // Sky 400
        if (count >= 2) return '#7DD3FC'; // Sky 300
        return '#BAE6FD'; // Sky 200
    };

    const renderGrid = () => {
        const today = new Date();
        const numWeeks = 52; // Full Year
        const days = [];
        const daySize = 13;
        const gap = 3;

        // We want to render columns (weeks)
        for (let w = 0; w < numWeeks; w++) {
            const weekDays = [];
            for (let d = 0; d < 7; d++) {
                // Calculate date for this cell
                // Start from (numWeeks - 1) weeks ago
                // We align so the last column is the current week
                const date = new Date(today);
                // Calculate how many days to subtract
                // (numWeeks - 1 - w) * 7 + (today.getDay() - d)
                const daysToSubtract = (numWeeks - 1 - w) * 7 + (today.getDay() - d);
                date.setDate(date.getDate() - daysToSubtract);

                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const count = history[dateStr] || 0;

                weekDays.push(
                    <div
                        key={d}
                        title={`${dateStr}: ${count} tasks`}
                        style={{
                            width: `${daySize}px`,
                            height: `${daySize}px`,
                            borderRadius: '2px', // Slightly rounded
                            backgroundColor: getIntensityColor(count),
                            opacity: 1,
                        }}
                    />
                );
            }
            days.push(
                <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
                    {weekDays}
                </div>
            );
        }
        return days;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', flexShrink: 0 }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.25rem' }}>
                Commit
            </h3>
            <div style={{
                display: 'flex',
                gap: '2px',
                // Removed container styling (bg, border, padding)
            }}>
                {renderGrid()}
            </div>
        </div>
    );
}
