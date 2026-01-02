import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Layout, Type, Smartphone, Grip, Flame, FileDown, Headphones, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LandingPage = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleOpenApp = () => {
        // Check if we are on localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log("Opening app...");
            window.location.href = '/app';
        } else {
            // Production: Go to app.chrct.com
            window.location.href = 'https://app.chrct.com';
        }
    };

    return (
        <div className="landing-page" style={{
            minHeight: '100vh',
            backgroundColor: '#0F1117',
            color: '#F1F5F9',
            fontFamily: "'Space Grotesk', sans-serif",
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Navbar */}
            <nav style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 50,
                backdropFilter: isScrolled ? 'blur(10px)' : 'none',
                backgroundColor: isScrolled ? 'rgba(15, 17, 23, 0.8)' : 'transparent',
                borderBottom: isScrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 'bold', fontSize: '1.5rem' }}>
                    <Sparkles size={28} className="text-blue-400" style={{ color: '#60A5FA' }} />
                    <span>chrct</span>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <button
                        onClick={handleOpenApp}
                        style={{
                            background: '#60A5FA',
                            color: 'white',
                            border: 'none',
                            padding: '0.7rem 1.5rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px 0 rgba(96, 165, 250, 0.39)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: '8rem 2rem 4rem',
                backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(96, 165, 250, 0.15) 0%, transparent 50%)'
            }}>
                <div className="badge" style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(96, 165, 250, 0.1)',
                    color: '#60A5FA',
                    borderRadius: '99px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '2rem',
                    border: '1px solid rgba(96, 165, 250, 0.2)'
                }}>
                    ❄️ Cirno handles that too
                </div>
                <h1 style={{
                    fontSize: 'clamp(3rem, 6vw, 5rem)',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    maxWidth: '900px',
                    marginBottom: '1.5rem',
                    background: 'linear-gradient(to bottom, #FFFFFF, #94A3B8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Make words count. <br />Make tasks matter.
                </h1>
                <p style={{
                    fontSize: '1.25rem',
                    color: '#94A3B8',
                    maxWidth: '600px',
                    lineHeight: 1.6,
                    marginBottom: '3rem'
                }}>
                    A seamless blend of a minimalist character counter and a powerful task manager. Stay in the flow while keeping track of your goals.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row' }}>
                    <button
                        onClick={handleOpenApp}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#60A5FA',
                            color: 'white',
                            border: 'none',
                            padding: '1rem 2rem',
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 10px 30px -10px rgba(96, 165, 250, 0.5)',
                            transition: 'all 0.2s'
                        }}
                    >
                        Launch App <ArrowRight size={20} />
                    </button>
                </div>
            </section>

            {/* Features Grid with Framer Motion */}
            <FeaturesGrid />

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                padding: '3rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                color: '#64748B',
                fontSize: '0.9rem'
            }}>
                <p>© 2026 chrct. All rights reserved.</p>
            </footer>
        </div>
    );
};

const FeaturesGrid = () => {
    const initialFeatures = [
        { id: 'stats', icon: <Type size={32} color="#60A5FA" />, title: "Real-time Statistics", desc: "Track characters, words, sentences, and paragraphs instantly as you type." },
        { id: 'tasks', icon: <CheckCircle2 size={32} color="#34D399" />, title: "Smart Task Management", desc: "Organize your writing goals and daily to-dos side-by-side with your content." },
        { id: 'drag', icon: <Grip size={32} color="#FBBF24" />, title: "Drag & Drop Workflow", desc: "Prioritize your day effortlessly. Drag to reorder tasks and subtasks." },
        { id: 'streak', icon: <Flame size={32} color="#EF4444" />, title: "Daily Streak Builder", desc: "Build a writing habit that sticks. Track your daily progress and keep your streak alive." },
        { id: 'zen', icon: <Layout size={32} color="#A78BFA" />, title: "Zen Mode", desc: "Eliminate distractions with a dedicated focus mode that hides everything but your work." },
        { id: 'export', icon: <FileDown size={32} color="#6366F1" />, title: "Universal Export", desc: "Take your work anywhere. Export seamlessly to Docx, PDF, or plain text in seconds." },
        { id: 'audio', icon: <Headphones size={32} color="#EC4899" />, title: "Immersive Audio", desc: "Get into the zone with satisfying typewriter sounds and optional ambient background music." },
        { id: 'theme', icon: <Palette size={32} color="#8B5CF6" />, title: "Visual Customization", desc: "Make it yours. Switch between sleek dark mode, light mode, or immersive wallpaper themes." },
        { id: 'mobile', icon: <Smartphone size={32} color="#F472B6" />, title: "Mobile Optimized", desc: "Write and check off tasks on the go with a fully responsive interface." },
    ];

    const [features, setFeatures] = useState(initialFeatures.map(f => ({ ...f, renderKey: f.id })));

    useEffect(() => {
        const interval = setInterval(() => {
            setFeatures(prev => {
                const [first, ...rest] = prev;
                // Give the re-added item a new key to trigger Enter animation
                const reAdded = { ...first, renderKey: `${first.id}-${Date.now()}` };
                return [...rest, reAdded];
            });
        }, 4000); // Rotate every 4 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', overflow: 'hidden' }}>
            <motion.div
                layout
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '2rem',
                    position: 'relative'
                }}
            >
                <AnimatePresence mode='popLayout'>
                    {features.slice(0, 6).map((feature) => (
                        <FeatureCard
                            key={feature.renderKey}
                            layout
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -20, scale: 0.95 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            {...feature}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
        </section>
    );
};

const FeatureCard = ({ icon, title, desc, ...props }: any) => (
    <motion.div
        {...props}
        style={{
            padding: '2rem',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}
    >
        <div style={{ marginBottom: '1.5rem' }}>{icon}</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>{title}</h3>
        <p style={{ color: '#94A3B8', lineHeight: 1.6 }}>{desc}</p>
    </motion.div>
);
