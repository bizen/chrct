
import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';


export function ActiveTaskPill() {
    const rawTasks = useQuery(api.tasks.get) || [];
    const [activeTask, setActiveTask] = useState<any>(null);
    const [elapsed, setElapsed] = useState(0);

    // Find the active task
    useEffect(() => {
        const found = rawTasks.find((t: any) => t.status === 'active');
        setActiveTask(found || null);
    }, [rawTasks]);

    // Timer logic
    useEffect(() => {
        if (!activeTask) return;

        // Initial set
        const updateTimer = () => {
            const now = Date.now();
            const currentSession = activeTask.activeSince ? (now - activeTask.activeSince) : 0;
            const total = (activeTask.totalTime || 0) + currentSession;
            setElapsed(total);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [activeTask]);

    // Update the browser tab title with the active task name
    useEffect(() => {
        if (activeTask) {
            document.title = `${activeTask.text} | chrct`;
        } else {
            document.title = 'chrct';
        }
        return () => {
            document.title = 'chrct';
        };
    }, [activeTask]);

    if (!activeTask) return null;

    const formatTime = (ms: number) => {
        if (ms < 0) ms = 0;
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)));

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            position: 'fixed',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000, // Ensure it's above everything including the header
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(96, 165, 250, 0.4)',
            boxShadow: '0 0 15px rgba(96, 165, 250, 0.25), 0 0 5px rgba(96, 165, 250, 0.1)',
            color: '#e2e8f0',
            fontSize: '0.8rem',
            fontWeight: 500,
            maxWidth: '90vw',
            animation: 'slideDownFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none', // Allow clicks to pass through if it overlaps something critical? Maybe yes for now.
            // Actually, if it's info only, pointer properties are fine.
        }}>
            <div className="animate-pulse">
                <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#60A5FA',
                    boxShadow: '0 0 8px #60A5FA'
                }} />
            </div>



            {
                activeTask.text.length > 10 ? (
                    <div style={{
                        maxWidth: '150px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        opacity: 0.9,
                        maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
                    }}>
                        <div style={{
                            display: 'flex',
                            animation: 'marquee 8s linear infinite',
                            width: 'max-content'
                        }}>
                            <span style={{ paddingRight: '2rem' }}>{activeTask.text}</span>
                            <span style={{ paddingRight: '2rem' }}>{activeTask.text}</span>
                        </div>
                    </div>
                ) : (
                    <span style={{
                        maxWidth: '150px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        opacity: 0.9
                    }}>
                        {activeTask.text}
                    </span>
                )
            }

            <div style={{
                width: '1px',
                height: '10px',
                backgroundColor: 'rgba(255,255,255,0.15)'
            }} />

            <div style={{
                fontVariantNumeric: 'tabular-nums',
                color: '#60A5FA',
                fontWeight: 700,
                letterSpacing: '0.02em'
            }}>
                {formatTime(elapsed)}
            </div>

            <style>{`
                @keyframes slideDownFade {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div >
    );
}
