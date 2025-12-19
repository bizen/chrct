import { useState, useEffect } from 'react';
import { X, BarChart } from 'lucide-react';
import { useUser } from "@clerk/clerk-react";
import { PerplexityWidget } from './hub/PerplexityWidget';
import { BookmarkWidget } from './hub/BookmarkWidget';
import { TaskStatsModal } from './TaskStatsModal';

interface RightHubSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'dark' | 'light' | 'wallpaper';
}

export function RightHubSidebar({
    isOpen,
    onClose,
    theme,
}: RightHubSidebarProps) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { isSignedIn } = useUser();
    const [isStatsOpen, setIsStatsOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // On mobile, the Left Hub handles everything. We hide this one completely.
    if (isMobile) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                bottom: 'auto',
                right: 0, // Fixed to right
                height: '100vh',
                width: 'auto',
                zIndex: 40,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
            {/* Inner Slate */}
            <div
                className="no-scrollbar"
                style={{
                    pointerEvents: 'auto',
                    width: '310px',
                    height: 'auto',
                    maxHeight: 'calc(100vh - 4rem)',
                    position: 'absolute',
                    top: '6rem',
                    right: '1rem', // Specific to Right Sidebar
                    backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(29, 35, 51, 0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: theme === 'light' ? '0 10px 40px -10px rgba(0, 0, 0, 0.1)' : '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    padding: '1.5rem',
                    overflowY: 'auto',
                    // Slide from Right
                    transform: isOpen
                        ? 'translateX(0)'
                        : 'translateX(120%)',
                    transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    color: theme === 'light' ? '#1f2937' : 'white',
                }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


                    {/* Optional Close Button - might be redundant if the main toggle controls both, but good to have */}
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: theme === 'light' ? '#4b5563' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        className="hover-bg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <PerplexityWidget theme={theme} />
                <BookmarkWidget theme={theme} />

                {/* Signed In Only: Task Stats Button */}
                {isSignedIn && (
                    <button
                        onClick={() => setIsStatsOpen(true)}
                        style={{
                            marginTop: 'auto', // Push to bottom if container has height, otherwise just at end
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                            color: theme === 'light' ? '#374151' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                        }}
                        className="hover-bg"
                    >
                        <BarChart size={18} />
                        View Task Stats
                    </button>
                )}
            </div>

            <TaskStatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} theme={theme} />
        </div>
    );
}
