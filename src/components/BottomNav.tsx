
import { Target, Rocket, Pen, LayoutGrid } from 'lucide-react';

interface BottomNavProps {
    activeTab: 'super_goal' | 'launchpad' | 'writing';
    onTabChange: (tab: 'super_goal' | 'launchpad' | 'writing') => void;
    onOpenHub: () => void;
    theme: 'dark' | 'light' | 'wallpaper';
}

export function BottomNav({ activeTab, onTabChange, onOpenHub, theme }: BottomNavProps) {
    const glassStyle = {
        backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(18, 22, 32, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
        color: theme === 'light' ? '#1f2937' : 'white',
    };

    const navItemStyle = (isActive: boolean) => ({
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '12px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
        transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
    });

    const labelStyle = {
        fontSize: '10px',
        fontWeight: 600,
        opacity: 0.8,
        letterSpacing: '0.02em',
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '80px', // slightly taller for modern fee
            zIndex: 1000,
            display: 'flex',
            paddingBottom: '20px', // Safe area for iPhone home bar
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            ...glassStyle
        }}>
            <button
                style={navItemStyle(activeTab === 'super_goal')}
                onClick={() => onTabChange('super_goal')}
            >
                <Target size={24} strokeWidth={activeTab === 'super_goal' ? 2.5 : 2} />
                <span style={labelStyle}>Goals</span>
            </button>

            <button
                style={navItemStyle(activeTab === 'launchpad')}
                onClick={() => onTabChange('launchpad')}
            >
                <Rocket size={24} strokeWidth={activeTab === 'launchpad' ? 2.5 : 2} />
                <span style={labelStyle}>Launchpad</span>
            </button>

            <button
                style={navItemStyle(activeTab === 'writing')}
                onClick={() => onTabChange('writing')}
            >
                <Pen size={24} strokeWidth={activeTab === 'writing' ? 2.5 : 2} />
                <span style={labelStyle}>Write</span>
            </button>

            <button
                style={navItemStyle(false)}
                onClick={onOpenHub}
            >
                <LayoutGrid size={24} strokeWidth={2} />
                <span style={labelStyle}>Hub</span>
            </button>
        </div>
    );
}
