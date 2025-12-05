import { useState, useEffect } from 'react';

export function ClockWidget({ theme }: { theme: 'dark' | 'light' | 'wallpaper' }) {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateString = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.05em', color: theme === 'light' ? '#111827' : 'var(--text-primary)' }}>
                {timeString}
            </div>
            <div style={{ fontSize: '0.9rem', color: theme === 'light' ? '#4b5563' : 'var(--text-secondary)', fontWeight: 500 }}>
                {dateString}
            </div>
        </div>
    );
}
