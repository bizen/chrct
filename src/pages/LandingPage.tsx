import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Zap, FileText, Star, ChevronDown, Rocket, Shield, Target } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { PricingCards } from '../components/PricingCards';
import cirnoImg from '../assets/cirno.png';
import { HeroBackground } from '../components/HeroBackground';

export const LandingPage = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const { scrollY } = useScroll();

    // Header interaction states
    const [isHeaderHovered, setIsHeaderHovered] = useState(false);
    const [headerPrefix, setHeaderPrefix] = useState<'chiruno' | 'character'>('character');

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isHeaderHovered) {
            setHeaderPrefix('character');
            interval = setInterval(() => {
                setHeaderPrefix(prev => prev === 'chiruno' ? 'character' : 'chiruno');
            }, 2000);
        } else {
            setHeaderPrefix('character');
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isHeaderHovered]);

    // Parallax Effects
    const heroY = useTransform(scrollY, [0, 500], [0, 150]);
    const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleOpenApp = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.location.href = '/app';
        } else {
            window.location.href = 'https://app.chrct.com';
        }
    };

    return (
        <div className="landing-page" style={{
            minHeight: '100vh',
            backgroundColor: '#0F1117',
            color: '#F1F5F9',
            fontFamily: "'Space Grotesk', sans-serif",
            overflowX: 'hidden'
        }}>
            {/* Dynamic Background */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                {/* Grid Overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    zIndex: -1
                }} />
                <div style={{
                    position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw',
                    background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)',
                    filter: 'blur(100px)', borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw',
                    background: 'radial-gradient(circle, rgba(167, 139, 250, 0.1) 0%, transparent 70%)',
                    filter: 'blur(100px)', borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '80vw', height: '80vw',
                    background: 'radial-gradient(circle, rgba(56, 189, 248, 0.03) 0%, transparent 50%)',
                    filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none'
                }} />
                {/* Noise Texture Overlay */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1, opacity: 0.05, pointerEvents: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }} />
            </div>

            {/* Navbar */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, padding: '1.5rem 2rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50,
                    backdropFilter: isScrolled ? 'blur(16px)' : 'none',
                    backgroundColor: isScrolled ? 'rgba(15, 17, 23, 0.6)' : 'transparent',
                    borderBottom: isScrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transition: 'background-color 0.3s ease, border-bottom 0.3s ease'
                }}
            >
                <div
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        fontWeight: 'bold', fontSize: '1.5rem', cursor: 'pointer',
                        userSelect: 'none'
                    }}
                    onMouseEnter={() => setIsHeaderHovered(true)}
                    onMouseLeave={() => setIsHeaderHovered(false)}
                >
                    <Sparkles size={28} className="text-blue-400" style={{ color: '#60A5FA' }} />
                    <div className="logo-text" style={{ display: 'flex', alignItems: 'baseline' }}>
                        <span className="logo-static" style={{ color: isHeaderHovered ? '#60A5FA' : 'inherit' }}>ch</span>
                        <AnimatedPart isVisible={isHeaderHovered} text={headerPrefix === 'chiruno' ? 'i' : 'a'} color="#60A5FA" />
                        <span className="logo-static" style={{ color: isHeaderHovered ? '#60A5FA' : 'inherit' }}>r</span>
                        <AnimatedPart isVisible={isHeaderHovered} text={headerPrefix === 'chiruno' ? 'uno' : 'acter'} color="#60A5FA" />
                        <span className="logo-static" style={{ color: 'inherit' }}>c</span>
                        <AnimatedPart isVisible={isHeaderHovered} text="oun" color="inherit" />
                        <span className="logo-static" style={{ color: 'inherit' }}>t</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                        style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                        Pricing
                    </button>
                    <motion.button onClick={handleOpenApp}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        style={{
                            background: '#60A5FA', color: 'white', padding: '0.7rem 1.5rem',
                            borderRadius: '0px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(167, 139, 250, 0.4), 0 0 10px rgba(251, 191, 36, 0.2)',
                            border: '1px solid rgba(167, 139, 250, 0.3)',
                            fontFamily: "'Space Grotesk', sans-serif"
                        }}>
                        Launch App
                    </motion.button>
                </div>
            </motion.nav >

            {/* Hero Section */}
            < motion.section
                style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                    padding: '8rem 2rem 4rem', position: 'relative', zIndex: 1,
                    y: heroY, opacity: heroOpacity
                }}
            >
                <HeroBackground />
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    style={{
                        padding: '0.5rem 1rem', background: 'rgba(96, 165, 250, 0.1)', color: '#60A5FA',
                        borderRadius: '0px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '2rem',
                        border: '1px solid rgba(96, 165, 250, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Star size={14} fill="#60A5FA" /> price increases soon
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
                    style={{
                        fontSize: 'clamp(3.5rem, 8vw, 7rem)', fontWeight: 800, lineHeight: 1.05, maxWidth: '1100px',
                        marginBottom: '1.5rem', letterSpacing: '-0.04em',
                        background: 'linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        textShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        fontFamily: "'Playfair Display', serif"
                    }}
                >
                    Life, Reimagined.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
                    style={{
                        fontSize: '1.25rem', color: '#94A3B8', maxWidth: '650px', lineHeight: 1.6, marginBottom: '3rem'
                    }}
                >
                    Construct your daily protocol. The <b>Launchpad</b> aligns your objectives.
                    <b>Snipe Focus</b> ensures absolute execution. No distractions.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    style={{ display: 'flex', gap: '1rem', flexDirection: 'row', marginBottom: '4rem' }}
                >
                    <motion.button onClick={handleOpenApp}
                        whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(167, 139, 250, 0.6), 0 0 20px rgba(251, 191, 36, 0.4)' }} whileTap={{ scale: 0.95 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#60A5FA', color: 'white',
                            padding: '1rem 2.5rem', borderRadius: '0px', fontSize: '1.1rem', fontWeight: 600,
                            cursor: 'pointer', boxShadow: '0 0 30px rgba(167, 139, 250, 0.4), 0 0 15px rgba(251, 191, 36, 0.2)',
                            border: '1px solid rgba(167, 139, 250, 0.3)',
                            fontFamily: "'Space Grotesk', sans-serif"
                        }}
                    >
                        Start Creating <ArrowRight size={20} />
                    </motion.button>
                </motion.div>

                {/* App Visualization */}
                <AppPreview />

            </motion.section >



            {/* Bento Grid Features */}
            < section style={{ padding: '8rem 2rem', position: 'relative', zIndex: 2 }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                        <BentoCard
                            icon={<Rocket size={32} color="#FBBF24" />}
                            title="LAUNCHPAD"
                            desc="Centralized command. Consolidate specific objectives into a unified operational view."
                            delay={0}
                        />
                        <BentoCard
                            icon={<Target size={32} color="#A78BFA" />}
                            title="SNIPE FOCUS"
                            desc="Target acquisition. Isolate active tasks with precision while background noise is eliminated."
                            delay={0.1}
                        />
                        <BentoCard
                            icon={<Shield size={32} color="#34D399" />}
                            title="SOLID STATE"
                            desc="Data persistence. End-to-end encrypted synchronization via Convex with offline-first architecture."
                            delay={0.2}
                        />
                    </div>
                </div>
            </section >

            {/* Precision Metrics with Graphs */}
            < section style={{ padding: '6rem 2rem', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Precision Metrics</h2>
                    <p style={{ color: '#94A3B8' }}>Track every detail of your creative process.</p>
                </div>

                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '2rem'
                }}>
                    {/* Writing Activity Card - Bar Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '0px',
                            padding: '2.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.5), transparent)' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={20} className="text-blue-400" style={{ color: '#60A5FA' }} />
                                Writing Volume
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '0.2rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '99px' }}>Last 7 Days</span>
                        </div>

                        <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem', padding: '1rem 0' }}>
                            {[45, 70, 35, 90, 60, 85, 100].map((height, i) => (
                                <StatsBar key={i} height={height} color="#60A5FA" delay={i * 0.1} />
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60A5FA' }}>15.2k</div>
                                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>CHARACTERS</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60A5FA' }}>3.4k</div>
                                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>WORDS</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60A5FA' }}>156</div>
                                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>PARAGRAPHS</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Productivity Card - Donut Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '0px',
                            padding: '2.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.5), transparent)' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Zap size={20} className="text-purple-400" style={{ color: '#A78BFA' }} />
                                Productivity Hub
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '0.2rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '99px' }}>Daily Goal</span>
                        </div>

                        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <DonutChart percent={84} color="#A78BFA" size={160} strokeWidth={12} />
                            <div style={{ position: 'absolute', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#F1F5F9' }}>84<span style={{ fontSize: '1.5rem', color: '#94A3B8' }}>%</span></div>
                                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '-0.2rem' }}>COMPLETED</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#A78BFA' }}>42.5</div>
                                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>WEEKLY HOURS</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#A78BFA' }}>1,248</div>
                                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>HOURS</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#A78BFA' }}>482</div>
                                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>TASKS</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section >

            {/* Testimonials Marquee */}
            < section style={{ padding: '6rem 0' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#E2E8F0' }}>Will Be Loved by Focus Seekers</h2>
                </div>
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                        display: 'flex',
                        gap: '2rem',
                        width: 'max-content',
                        animation: 'marquee 40s linear infinite'
                    }}>
                        {[...Array(2)].map((_, i) => (
                            <div key={i} style={{ display: 'flex', gap: '2rem' }}>
                                <TestimonialCard name="Alex R." role="Novelist" text="The most distraction-free editor I've ever used. The task integration is a game changer." />
                                <TestimonialCard name="Sarah K." role="Content Creator" text="I can't imagine my daily workflow without chrct. It's beautiful and fast." />
                                <TestimonialCard name="Davide B." role="Developer" text="Finally, an app that understands flow state. The dark mode is perfect." />
                                <TestimonialCard name="Yuna M." role="Student" text="Helps me organize my essays and assignments. Simple yet powerful." />
                                <TestimonialCard name="Chris P." role="Journalist" text="Seamless syncing between my phone and laptop. Writing on the go is a breeze." />
                            </div>
                        ))}
                    </div>
                </div>
                <style>{`
                    @keyframes marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                `}</style>
            </section >


            {/* Main Pricing Section */}
            < section id="pricing" style={{
                padding: '8rem 2rem',
                position: 'relative', zIndex: 2,
                background: 'linear-gradient(to bottom, #0F1117 0%, #111827 100%)'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{ marginBottom: '5rem' }}
                    >
                        <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.02em', fontFamily: "'Playfair Display', serif" }}>
                            Unlock your potential.
                        </h2>
                        <p style={{ fontSize: '1.25rem', color: '#94A3B8', maxWidth: '600px', margin: '0 auto' }}>
                            Premium tools for serious creators. Sync across devices and customize your experience.
                        </p>
                    </motion.div>

                    <PricingCards />

                    <div style={{ marginTop: '5rem' }}>
                        <p style={{ color: '#64748B', marginBottom: '1rem' }}>Already have a license key?</p>
                        <button onClick={handleOpenApp} style={{
                            background: 'transparent', border: '1px solid #334155', color: '#94A3B8',
                            padding: '0.75rem 2rem', borderRadius: '0px', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s'
                        }} className='hover:border-blue-400 hover:text-blue-400'>
                            Activate License
                        </button>
                    </div>
                </div>
            </section >

            {/* FAQ Section */}
            < section style={{ padding: '6rem 2rem', background: '#0F1117' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '3rem', textAlign: 'center' }}>Frequently Asked Questions</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <FAQItem question="Is my data secure?" answer="Yes, absolutely. We use industry-standard encryption and your data is synced securely via Convex. We do not sell your data." />
                        <FAQItem question="Can I use chrct on multiple devices?" answer="Yes! With a license, you can sync your writing and tasks across all your devices in real-time." />
                        <FAQItem question="Is there a student discount?" answer="We offer special pricing for students. Please contact us via Twitter for more details." />
                        <FAQItem question="What happens if I lose internet?" answer="chrct works offline. Your changes are saved locally and synced automatically once you're back online." />
                    </div>
                </div>
            </section >


            {/* Footer */}
            < footer style={{
                textAlign: 'center', padding: '4rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)',
                color: '#64748B', fontSize: '0.9rem', background: '#0F1117'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <Sparkles size={32} className="text-blue-400" style={{ color: '#60A5FA', opacity: 0.8 }} />
                    <nav style={{ display: 'flex', gap: '2rem' }}>
                        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
                        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
                        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Twitter</a>
                    </nav>
                    <p style={{ opacity: 0.6 }}>© 2026 chrct. Crafted with ❄️ by Cirno.</p>
                </div>
            </footer >
        </div >
    );
};

// Subcomponents

const BentoCard = ({ icon, title, desc, delay }: any) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 0 30px rgba(167, 139, 250, 0.15)', borderColor: 'rgba(167, 139, 250, 0.3)' }}
            style={{
                padding: '2.5rem',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '0px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                cursor: 'default',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div style={{
                width: '60px', height: '60px', borderRadius: '0px',
                background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.5rem'
            }}>
                {icon}
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{title}</h3>
            <p style={{ color: '#94A3B8', lineHeight: 1.6 }}>{desc}</p>
        </motion.div>
    );
}

const StatsBar = ({ height, color, delay }: { height: number, color: string, delay: number }) => {
    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            whileInView={{ height: `${height}%`, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay, ease: "circOut" }}
            style={{
                width: '100%',
                background: `linear-gradient(to top, ${color}20, ${color})`,
                borderRadius: '0px',
                position: 'relative'
            }}
        >
        </motion.div>
    );
};

const DonutChart = ({ percent, color, size, strokeWidth }: any) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="transparent" />
            <motion.circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke={color} strokeWidth={strokeWidth} fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                whileInView={{ strokeDashoffset: offset }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
            />
        </svg>
    );
};

const AnimatedPart = ({ isVisible, text, color }: { isVisible: boolean; text: string; color: string }) => {
    const [currentText, setCurrentText] = useState(text);
    const [previousText, setPreviousText] = useState<string | null>(null);

    useEffect(() => {
        if (text !== currentText) {
            setPreviousText(currentText);
            setCurrentText(text);
        }
    }, [text, currentText]);

    useEffect(() => {
        if (previousText) {
            const timer = setTimeout(() => {
                setPreviousText(null);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [previousText]);

    useEffect(() => {
        if (!isVisible) {
            const timer = setTimeout(() => {
                setPreviousText(null);
                setCurrentText(text);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isVisible, text]);

    return (
        <span className="logo-animated" style={{
            maxWidth: isVisible ? '200px' : '0',
            opacity: isVisible ? 1 : 0,
            color: color,
            overflow: 'hidden',
            display: 'inline-block',
            verticalAlign: 'bottom',
            transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
            whiteSpace: 'nowrap',
            position: 'relative'
        }}
        >
            {previousText && <span className="slide-out-up" style={{ color }}>{previousText}</span>}
            <span className={previousText ? "slide-in-up" : ""} key={currentText}>{currentText}</span>
        </span>
    );
};

const AppPreview = () => {
    const [index, setIndex] = useState(0);
    const fullText = "Create something wonderful today.";

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prev => {
                if (prev > fullText.length + 15) { // Pause at end before looping
                    return 0;
                }
                return prev + 1;
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const renderText = () => {
        const part1 = "Create something ";
        const part2 = "wonderful";
        const part3 = " today.";

        const currentLen = Math.min(index, fullText.length);
        const len1 = Math.min(currentLen, part1.length);
        const len2 = Math.min(Math.max(0, currentLen - part1.length), part2.length);
        const len3 = Math.min(Math.max(0, currentLen - part1.length - part2.length), part3.length);

        return (
            <>
                {part1.substring(0, len1)}
                <span style={{ color: '#60A5FA' }}>{part2.substring(0, len2)}</span>
                {part3.substring(0, len3)}
            </>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            style={{
                width: '100%', maxWidth: '900px', height: '500px',
                background: '#0F1117',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                borderRadius: '0px',
                boxShadow: '0 0 60px rgba(167, 139, 250, 0.15), 0 0 30px rgba(251, 191, 36, 0.1), 0 20px 50px rgba(0,0,0,0.5)',
                margin: '0 auto',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Window Controls */}
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }} />
            </div>

            {/* Fake Content */}
            <div style={{ padding: '2rem', display: 'flex', height: '100%' }}>
                {/* Main Area */}
                <div style={{ flex: 1, paddingRight: '2rem', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: '#E2E8F0' }}>
                        {renderText()}<span className="animate-pulse">|</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.2rem 0.8rem', borderRadius: '0px', background: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.3)', color: '#60A5FA', fontSize: '0.75rem', letterSpacing: '0.05em' }}>LAUNCHPAD ACTIVE</div>
                    </div>
                    <div style={{ height: '15px', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '0.8rem' }} />
                    <div style={{ height: '15px', width: '90%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '0.8rem' }} />
                    <div style={{ height: '15px', width: '95%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '0.8rem' }} />
                </div>

                {/* Sidebar (now on Right) */}
                <div style={{ width: '200px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '20px', width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '1rem' }} />
                    <div style={{ height: '20px', width: '60%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '20px', width: '70%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '0.5rem' }} />

                    {/* Cirno Image */}
                    <div style={{ paddingBottom: '13rem', marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
                        <img
                            src={cirnoImg}
                            alt="Cirno"
                            style={{
                                width: '150px',
                                opacity: 0.8,
                                filter: 'drop-shadow(0 0 10px rgba(96, 165, 250, 0.3))',
                                maskImage: 'linear-gradient(to bottom, black 80%, transparent)',
                                animation: 'float 6s ease-in-out infinite'
                            }}
                        />
                    </div>
                </div>
            </div>
            {/* Gradient Overlay */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(to top, #0F1117, transparent)', pointerEvents: 'none' }} />
        </motion.div>
    );
}

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%', padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'none', border: 'none', color: '#F1F5F9', fontSize: '1.2rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                    fontFamily: "'Space Grotesk', sans-serif"
                }}
            >
                {question}
                <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} color="#94A3B8" />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <p style={{ paddingBottom: '1.5rem', color: '#94A3B8', lineHeight: 1.6 }}>{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}



const TestimonialCard = ({ name, role, text }: any) => (
    <div style={{
        width: '300px', padding: '1.5rem', background: 'rgba(255,255,255,0.03)',
        borderRadius: '0px', border: '1px solid rgba(255,255,255,0.05)'
    }}>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#CBD5E1', marginBottom: '1.5rem' }}>"{text}"</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '0px', background: 'linear-gradient(135deg, #60A5FA, #A78BFA)' }} />
            <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{name}</div>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{role}</div>
            </div>
        </div>
    </div>
)
