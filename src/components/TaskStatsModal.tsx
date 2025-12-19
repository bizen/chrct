
import { X, BarChart, Trophy, Calendar, Zap, Clock, Hourglass, Target } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { TaskCommitWidget } from './hub/TaskCommitWidget';

interface TaskStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'dark' | 'light' | 'wallpaper';
}

export function TaskStatsModal({ isOpen, onClose, theme }: TaskStatsModalProps) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { isAuthenticated } = useConvexAuth();
    const tasks = useQuery(api.tasks.get, isAuthenticated ? {} : "skip") || [];

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { history, stats, totalHours, longestTask } = useMemo(() => {
        const historyMap: Record<string, number> = {};
        let totalTimeMs = 0;

        // Weekly Stats Helpers
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        let maxDuration = 0;
        let longestTaskData = { text: '-', time: 0 };

        tasks.forEach((t: any) => {
            // History (Completed Count)
            if (t.status === 'completed' && t.completedAt) {
                historyMap[t.completedAt] = (historyMap[t.completedAt] || 0) + 1;

                // Check if this completed task is from this week for "Longest Task (Week)"
                const completedDate = new Date(t.completedAt);
                // Reset hours to compare dates properly ensuring we cover the full day
                completedDate.setHours(0, 0, 0, 0);
                // Fix: completedAt is YYYY-MM-DD, parsing it as UTC or local? 
                // new Date('2023-01-01') is usually UTC. 
                // But simplified comparison:
                if (completedDate >= startOfWeek) {
                    const time = t.totalTime || 0;
                    if (time > maxDuration) {
                        maxDuration = time;
                        longestTaskData = { text: t.text, time };
                    }
                }
            }

            // Global Total Time (keep tracking all time?)
            // If user only asked for "longest task this week", I assume Total Hours remains global?
            // "Productivity Hub" usually shows accumulated stats. 
            // I'll keep totalTimeMs counting ALL tasks for the "Total Hours" card.
            totalTimeMs += (t.totalTime || 0);
        });

        const entries = Object.entries(historyMap);
        const totalTasks = entries.reduce((acc, [, count]) => acc + count, 0);
        const activeDays = entries.filter(([, count]) => count > 0).length;

        let maxTasks = 0;
        let bestDay = '-';

        entries.forEach(([date, count]) => {
            if (count > maxTasks) {
                maxTasks = count;
                bestDay = date;
            }
        });

        const today = new Date();
        const currentMonthKey = `${today.getFullYear()} -${String(today.getMonth() + 1).padStart(2, '0')} `;
        const tasksThisMonth = entries
            .filter(([date]) => date.startsWith(currentMonthKey))
            .reduce((acc, [, count]) => acc + count, 0);

        const totalHours = Math.round(totalTimeMs / (1000 * 60 * 60) * 10) / 10; // 1 decimal place

        return {
            history: historyMap,
            stats: { totalTasks, activeDays, maxTasks, bestDay, tasksThisMonth },
            totalHours,
            longestTask: longestTaskData
        };
    }, [tasks]);

    const chartData = useMemo(() => {
        const days = 30;
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = `${date.getFullYear()} -${String(date.getMonth() + 1).padStart(2, '0')} -${String(date.getDate()).padStart(2, '0')} `;
            const count = history[dateStr] || 0;
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            data.push({ date: dateStr, count, dayLabel });
        }
        return data;
    }, [history]);

    const maxChartValue = Math.max(...chartData.map(d => d.count), 5); // Minimum 5 for scale

    if (!isOpen) return null;

    const bgColor = theme === 'light' ? 'white' : 'rgba(30, 41, 59, 0.95)';
    const textColor = theme === 'light' ? '#1f2937' : 'white';
    const subTextColor = theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.6)';
    const borderColor = theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    const accentColor = '#60A5FA';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
            transition: 'opacity 0.2s',
            padding: '1rem',
        }} onClick={onClose}>
            <div style={{
                backgroundColor: bgColor,
                padding: '2.5rem',
                borderRadius: '32px',
                width: '100%',
                maxWidth: '1100px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: `1px solid ${borderColor} `,
                color: textColor,
            }} onClick={e => e.stopPropagation()} className="no-scrollbar">

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        padding: '0.5rem',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'inherit',
                        opacity: 0.7,
                    }}
                    className="hover-bg"
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <BarChart size={28} color={accentColor} />
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>Productivity Hub</h2>
                    </div>
                    <p style={{ color: subTextColor, margin: 0, fontSize: '1.1rem' }}>Your task completion insights and history.</p>
                </div>

                {/* KPI Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', // Adjusted for 6 items
                    gap: '1rem',
                    marginBottom: '2.5rem'
                }}>
                    <StatCard
                        icon={<Trophy size={20} color="#F59E0B" />}
                        label="Total Completed"
                        value={stats.totalTasks}
                        theme={theme}
                    />
                    <StatCard
                        icon={<Calendar size={20} color="#10B981" />}
                        label="Active Days"
                        value={stats.activeDays}
                        theme={theme}
                    />
                    <StatCard
                        icon={<Zap size={20} color="#F43F5E" />}
                        label="Best Day"
                        value={stats.maxTasks}
                        subValue={stats.bestDay}
                        theme={theme}
                    />
                    <StatCard
                        icon={<Clock size={20} color="#8B5CF6" />}
                        label="This Month"
                        value={stats.tasksThisMonth}
                        theme={theme}
                    />
                    <StatCard
                        icon={<Hourglass size={20} color="#3B82F6" />}
                        label="Total Hours"
                        value={totalHours}
                        theme={theme}
                    />
                    <StatCard
                        icon={<Target size={20} color="#EC4899" />}
                        label="Longest Task (Week)"
                        value={(() => {
                            const hours = Math.floor(longestTask.time / (1000 * 60 * 60));
                            const mins = Math.floor((longestTask.time / (1000 * 60)) % 60);
                            return `${hours}h ${mins} m`;
                        })()}
                        subValue={longestTask.text.length > 20 ? longestTask.text.slice(0, 20) + '...' : longestTask.text}
                        theme={theme}
                    />
                </div>

                {/* Stacked Layout for Charts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>

                    {/* Main Chart: Daily Activity */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '24px',
                        backgroundColor: theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${borderColor} `
                    }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Last 30 Days Activity
                        </h3>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            height: '300px',
                            paddingTop: '1rem',
                            gap: '8px'
                        }}>
                            {chartData.map((d, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <div
                                        className="bar-animate"
                                        style={{
                                            width: '100%',
                                            maxWidth: '24px',
                                            height: `${Math.max((d.count / maxChartValue) * 100, 4)}% `,
                                            backgroundColor: d.count > 0 ? accentColor : (theme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.1)'),
                                            borderRadius: '6px',
                                            opacity: d.count > 0 ? 1 : 0.5,
                                            transition: 'height 1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                            position: 'relative',
                                        }}
                                        title={`${d.date}: ${d.count} tasks`}
                                    >
                                        {d.count > 0 && (
                                            <span style={{
                                                position: 'absolute',
                                                top: '-20px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                color: subTextColor
                                            }}>
                                                {d.count}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 500 }}>{d.dayLabel}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Secondary: Activity Map (The original widget) */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '24px',
                        backgroundColor: theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${borderColor} `,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Yearly Map</h3>
                        <p style={{ fontSize: '0.85rem', color: subTextColor, marginBottom: '1rem' }}>
                            Commit density over the last year.
                        </p>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto', width: '100%' }}>
                            <TaskCommitWidget theme={theme} historyData={history} />
                        </div>
                    </div>

                </div>

                <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.85rem', marginTop: '1rem' }}>
                    <p>Keep doing tasks to see your stats grow!</p>
                </div>

            </div>
        </div>
    );
}

function StatCard({ icon, label, value, subValue, theme }: { icon: React.ReactNode, label: string, value: number | string, subValue?: string, theme: string }) {
    return (
        <div style={{
            padding: '1.25rem',
            borderRadius: '20px',
            backgroundColor: theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.05)',
            border: theme === 'light' ? '1px solid white' : '1px solid rgba(255,255,255,0.05)',
            boxShadow: theme === 'light' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8, fontSize: '0.85rem', fontWeight: 600 }}>
                {icon}
                {label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>
                {value}
            </div>
            {subValue && (
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.1rem' }}>
                    On {subValue}
                </div>
            )}
        </div>
    );
}
