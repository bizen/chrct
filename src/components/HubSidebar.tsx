import { useState, useEffect } from 'react';
import { LayoutGrid, BarChart, Target, Rocket, ChevronLeft, ChevronRight, Pen } from 'lucide-react';
import { useUser } from "@clerk/clerk-react";
import { ClockWidget } from './hub/ClockWidget';
import { ThemeWidget } from './hub/ThemeWidget';
import { InfoWidget } from './hub/InfoWidget';
import { MusicWidget } from './hub/MusicWidget';
import { TaskListWidget } from './hub/TaskListWidget';
import { CharacterCountWidget } from './hub/CharacterCountWidget';
import { TaskStatsModal } from './TaskStatsModal';
import type { SyncStatus } from '../hooks/useCloudSync';

interface HubSidebarProps {
    theme: 'dark' | 'light' | 'wallpaper';
    setTheme: (theme: 'dark' | 'light' | 'wallpaper') => void;
    isMusicPlaying: boolean;
    toggleMusic: () => void;
    musicVolume: number;
    onVolumeChange: (volume: number) => void;

    // Updated Navigation Props
    activeTab: 'super_goal' | 'launchpad' | 'writing';
    onTabChange: (tab: 'super_goal' | 'launchpad' | 'writing') => void;

    text: string;
    handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    stats: {
        characters: number;
        words: number;
        sentences: number;
        paragraphs: number;
        spaces: number;
    };
    saveStatus?: SyncStatus;
}

export function HubSidebar({
    theme,
    setTheme,
    isMusicPlaying,
    toggleMusic,
    musicVolume,
    onVolumeChange,
    activeTab,
    onTabChange,
    text,
    handleTextChange,
    stats,
    saveStatus
}: HubSidebarProps) {
    const [weather, setWeather] = useState<{ temp: number; code: number; city: string } | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { isSignedIn } = useUser();
    const [isStatsOpen, setIsStatsOpen] = useState(false);

    // New States for the Hub Structure
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem('chrct_hub_expanded');
        return saved ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        localStorage.setItem('chrct_hub_expanded', JSON.stringify(isExpanded));
    }, [isExpanded]);

    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number, city: string) => {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
                const data = await res.json();
                setWeather({
                    temp: Math.round(data.current.temperature_2m),
                    code: data.current.weather_code,
                    city,
                });
            } catch (e) {
                console.error("Weather fetch failed", e);
            }
        };


        // Default: West Melbourne
        const defaultLocation = { lat: -37.8136, lon: 144.9631, city: "West Melbourne" };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude, "Current Location");
                },
                () => {
                    fetchWeather(defaultLocation.lat, defaultLocation.lon, defaultLocation.city);
                }
            );
        } else {
            fetchWeather(defaultLocation.lat, defaultLocation.lon, defaultLocation.city);
        }
    }, []);

    // Theme styles helper
    const glassStyle = {
        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(29, 35, 51, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)',
        color: theme === 'light' ? '#1f2937' : 'white',
    };

    const iconButtonStyle = (isActive: boolean) => ({
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isActive ? (theme === 'light' ? '#2563eb' : '#60A5FA') : (theme === 'light' ? '#9ca3af' : 'rgba(255,255,255,0.4)'),
        backgroundColor: isActive ? (theme === 'light' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(96, 165, 250, 0.1)') : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: 'none',
        outline: 'none',
    });

    if (isMobile) return null; // Simplified for mobile for now based on request focusing on layout

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    top: '6rem', // Match App padding/header
                    left: '1rem',
                    bottom: '2rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    zIndex: 40,
                    height: 'calc(100vh - 8rem)',
                    pointerEvents: 'none', // Allow clicking through empty space
                }}
            >
                {/* 1. Left Icon Strip (Always Visible) */}
                <div
                    className="no-scrollbar"
                    style={{
                        ...glassStyle,
                        pointerEvents: 'auto',
                        width: '60px',
                        height: '100%',
                        borderRadius: '24px',
                        border: `1px solid ${glassStyle.borderColor}`,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '1rem 0',
                        gap: '1rem',
                    }}
                >
                    {/* Super Goal Icon */}
                    <button
                        style={iconButtonStyle(activeTab === 'super_goal')}
                        onClick={() => onTabChange('super_goal')}
                        title="Super Goals"
                    >
                        <Target size={24} />
                    </button>

                    {/* Launchpad Icon */}
                    <button
                        style={iconButtonStyle(activeTab === 'launchpad')}
                        onClick={() => onTabChange('launchpad')}
                        title="Launchpad"
                    >
                        <Rocket size={24} />
                    </button>

                    {/* Writing Icon */}
                    <button
                        style={iconButtonStyle(activeTab === 'writing')}
                        onClick={() => onTabChange('writing')}
                        title="Writing Mode"
                    >
                        <Pen size={24} />
                    </button>

                    <div style={{ flex: 1 }} />

                    {/* Expand/Collapse Toggle Button for Widget Panel */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            ...iconButtonStyle(false),
                            color: theme === 'light' ? '#4b5563' : 'rgba(255,255,255,0.6)',
                        }}
                        className="hover-bg"
                        title={isExpanded ? "Collapse Widgets" : "Expand Widgets"}
                    >
                        {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                {/* 2. Widget Panel (Collapsible) */}
                <div
                    className="no-scrollbar"
                    style={{
                        ...glassStyle,
                        pointerEvents: 'auto',
                        width: '310px',
                        height: '100%',
                        borderRadius: '24px',
                        border: `1px solid ${glassStyle.borderColor}`,
                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        padding: '1.5rem',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        // Animation properties
                        maxWidth: isExpanded ? '310px' : '0px',
                        opacity: isExpanded ? 1 : 0,
                        paddingLeft: isExpanded ? '1.5rem' : '0px',
                        paddingRight: isExpanded ? '1.5rem' : '0px',
                        borderWidth: isExpanded ? '1px' : '0px',
                        marginLeft: isExpanded ? '0' : '-1rem', // Pull it back when closed to hide gap
                        transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                >
                    <div style={{
                        minWidth: '260px', // Prevent content squishing during transition
                        opacity: isExpanded ? 1 : 0,
                        transition: 'opacity 0.2s ease',
                        transitionDelay: isExpanded ? '0.1s' : '0s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        height: '100%',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', color: 'inherit' }}>
                                <LayoutGrid size={20} color="var(--accent-color)" />
                                Hub
                            </h2>
                        </div>

                        {/* Widgets */}
                        <ClockWidget theme={theme} />
                        <InfoWidget theme={theme} weather={weather} />

                        {/* Show Character Count Widget always (as info) or conditionally? 
                            User said "Writing Mode" is 3rd icon. 
                            Let's keep showing widgets regardless of main view mode, 
                            but maybe adapt 'TaskListWidget' usage.
                            For now, keeping logic simple: show TaskListWidget only if NOT writing?
                            Actually, let's just keep the widgets consistent.
                        */}

                        {activeTab === 'writing' ? (
                            <CharacterCountWidget
                                text={text}
                                handleTextChange={handleTextChange}
                                stats={stats}
                                theme={theme}
                                saveStatus={saveStatus}
                            />
                        ) : (
                            <TaskListWidget theme={theme} onlyInput={true} />
                        )}

                        <MusicWidget
                            theme={theme}
                            isMusicPlaying={isMusicPlaying}
                            toggleMusic={toggleMusic}
                            musicVolume={musicVolume}
                            onVolumeChange={onVolumeChange}
                        />
                        <ThemeWidget theme={theme} setTheme={setTheme} />

                        {/* View Task Stats Button */}
                        {isSignedIn && (
                            <button
                                onClick={() => setIsStatsOpen(true)}
                                style={{
                                    marginTop: 'auto',
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                                    color: 'inherit',
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
                </div>
            </div>

            <TaskStatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} theme={theme} />
        </>
    );
}
