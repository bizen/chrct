import React from 'react';
import { Music, Play } from 'lucide-react';

export function MusicWidget({ theme, isMusicPlaying, toggleMusic }: { theme: 'dark' | 'light' | 'wallpaper'; isMusicPlaying: boolean; toggleMusic: () => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.25rem' }}>
                Music
            </h3>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '16px',
                border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.05)',
                color: theme === 'light' ? '#1f2937' : 'white',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: isMusicPlaying ? 'rgba(96, 165, 250, 0.2)' : (theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Music size={16} color={isMusicPlaying ? '#60A5FA' : (theme === 'light' ? '#4b5563' : 'var(--text-secondary)')} />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        {isMusicPlaying ? 'Playing' : 'Paused'}
                    </div>
                </div>

                <button
                    onClick={toggleMusic}
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isMusicPlaying ? 'var(--accent-color)' : (theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'),
                        color: isMusicPlaying ? 'white' : (theme === 'light' ? '#1f2937' : 'var(--text-primary)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    className="hover-bg"
                >
                    {isMusicPlaying ? (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '12px' }}>
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: '2px',
                                        backgroundColor: 'currentColor',
                                        borderRadius: '1px',
                                        height: '100%',
                                        animation: 'music-bar 0.8s ease-in-out infinite',
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <Play size={14} fill="currentColor" />
                    )}
                </button>
            </div>
        </div>
    );
}
