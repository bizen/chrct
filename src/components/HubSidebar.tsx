import { useState, useEffect } from 'react';
import { X, LayoutGrid } from 'lucide-react';
import { ClockWidget } from './hub/ClockWidget';
import { ThemeWidget } from './hub/ThemeWidget';
import { InfoWidget } from './hub/InfoWidget';
import { MusicWidget } from './hub/MusicWidget';

import { TaskListWidget } from './hub/TaskListWidget';
import { CharacterCountWidget } from './hub/CharacterCountWidget';
import { PerplexityWidget } from './hub/PerplexityWidget';
import { BookmarkWidget } from './hub/BookmarkWidget';
import type { SyncStatus } from '../hooks/useCloudSync';

interface HubSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'dark' | 'light' | 'wallpaper';
    setTheme: (theme: 'dark' | 'light' | 'wallpaper') => void;
    isMusicPlaying: boolean;
    toggleMusic: () => void;
    musicVolume: number;
    onVolumeChange: (volume: number) => void;
    viewMode: 'charCount' | 'taskList';
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
    isOpen,
    onClose,
    theme,
    setTheme,
    isMusicPlaying,
    toggleMusic,
    musicVolume,
    onVolumeChange,
    viewMode,
    text,
    handleTextChange,
    stats,
    saveStatus
}: HubSidebarProps) {
    const [weather, setWeather] = useState<{ temp: number; code: number; city: string } | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
    return (
        <>


            {/* Sidebar Container (Fixed Overlay) */}
            <div
                style={{
                    position: 'fixed',
                    top: isMobile ? 'auto' : 0,
                    bottom: isMobile ? 0 : 'auto',
                    left: 0,
                    height: isMobile ? 'auto' : '100vh',
                    width: isMobile ? '100%' : 'auto',
                    zIndex: 40,
                    pointerEvents: 'none', // Allow clicks through the container
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: isMobile ? 'flex-end' : 'center',
                }}
            >
                {/* Inner Slate */}
                <div
                    className="no-scrollbar"
                    style={{
                        pointerEvents: 'auto', // Re-enable clicks for the slate
                        width: isMobile ? '100%' : '310px',
                        height: isMobile ? '60vh' : 'auto',
                        maxHeight: isMobile ? '85vh' : 'calc(100vh - 4rem)',
                        position: isMobile ? 'relative' : 'absolute',
                        top: isMobile ? 'auto' : '6rem',
                        left: isMobile ? '0' : '1rem',
                        bottom: isMobile ? '0' : '2rem',
                        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(29, 35, 51, 0.6)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                        border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderBottom: isMobile ? 'none' : (theme === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)'),
                        boxShadow: theme === 'light' ? '0 10px 40px -10px rgba(0, 0, 0, 0.1)' : '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem', // Reduced gap
                        padding: '1.5rem',
                        overflowY: 'auto',
                        transform: isOpen
                            ? (isMobile ? 'translateY(0)' : 'translateX(0)')
                            : (isMobile ? 'translateY(100%)' : 'translateX(-120%)'),
                        transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        color: theme === 'light' ? '#1f2937' : 'white',
                    }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', color: theme === 'light' ? '#111827' : 'white' }}>
                            <LayoutGrid size={20} color="var(--accent-color)" />
                            Hub
                        </h2>
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

                    {/* Widgets */}
                    <ClockWidget theme={theme} />
                    <InfoWidget theme={theme} weather={weather} />

                    {/* Conditionally render TaskList or CharacterCount */}
                    {viewMode === 'charCount' ? (
                        <TaskListWidget theme={theme} onlyInput={true} />
                    ) : (
                        <CharacterCountWidget
                            text={text}
                            handleTextChange={handleTextChange}
                            stats={stats}
                            theme={theme}
                            saveStatus={saveStatus}
                        />
                    )}

                    {/* Removed TaskCommitWidget */}
                    <MusicWidget
                        theme={theme}
                        isMusicPlaying={isMusicPlaying}
                        toggleMusic={toggleMusic}
                        musicVolume={musicVolume}
                        onVolumeChange={onVolumeChange}
                    />
                    <ThemeWidget theme={theme} setTheme={setTheme} />

                    {isMobile && (
                        <>
                            <div style={{ width: '100%', height: '1px', backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }} />
                            <PerplexityWidget theme={theme} />
                            <BookmarkWidget theme={theme} />
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
