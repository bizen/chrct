import { Zap, Check, Crown } from 'lucide-react';

export function PricingCards() {
    // Pricing Links - Replace with actual Lemon Squeezy Checkout URLs
    const PRO_PLAN_URL = "https://chrct.lemonsqueezy.com/checkout/buy/3817f79d-94f8-43c8-9fae-3961663a46e7";
    const OWNER_PLAN_URL = "https://chrct.lemonsqueezy.com/checkout/buy/b6fdc093-23d8-448d-a0ed-d711f54eb83c";

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            width: '100%',
            maxWidth: '900px', // Match ActivationModal width constraint
            margin: '0 auto'
        }}>
            {/* Pro Plan */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'left' // Ensure text alignment
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '4px',
                    background: 'linear-gradient(90deg, #60A5FA, #3b82f6)'
                }} />

                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#60A5FA' }}>
                        <Zap size={20} />
                        <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>PRO PLAN</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>$9</span>
                        <span style={{ color: '#94A3B8' }}>/ YEAR</span>
                    </div>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', padding: 0 }}>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#60A5FA" /> 5 Devices Limit
                    </li>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#60A5FA" /> 5-Day Free Trial included
                    </li>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#60A5FA" /> Cloud Sync (Convex)
                    </li>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#60A5FA" /> Priority Updates
                    </li>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#60A5FA" /> Price increase soon
                    </li>
                </ul>

                <a
                    href={PRO_PLAN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        marginTop: 'auto',
                        background: 'rgba(96, 165, 250, 0.1)',
                        color: '#60A5FA',
                        border: '1px solid rgba(96, 165, 250, 0.2)',
                        padding: '1rem',
                        borderRadius: '0px',
                        textAlign: 'center',
                        fontWeight: '600',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        display: 'block'
                    }}
                    className="hover-bg"
                >
                    START 5-DAY TRIAL
                </a>
            </div>

            {/* Owner Plan */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(253, 185, 49, 0.3)',
                borderRadius: '0px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                position: 'relative',
                boxShadow: '0 0 40px rgba(255, 215, 0, 0.05)',
                textAlign: 'left'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'linear-gradient(90deg, #FFD700, #FDB931)',
                    color: 'black',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                }}>
                    BEST VALUE
                </div>

                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#FFD700' }}>
                        <Crown size={20} fill="#FFD700" />
                        <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>OWNER PLAN</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>$39</span>
                        <span style={{ color: '#94A3B8' }}>/ LIFETIME</span>
                    </div>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)', padding: 0 }}>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#FFD700" /> 8 Devices Limit
                    </li>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#FFD700" /> One-time Payment
                    </li>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#FFD700" /> Cloud Sync (Convex)
                    </li>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#FFD700" /> Lifetime Updates
                    </li>
                    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Check size={18} color="#FFD700" /> Price increase soon
                    </li>
                </ul>

                <a
                    href={OWNER_PLAN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        marginTop: 'auto',
                        background: 'linear-gradient(90deg, #FFD700, #FDB931)',
                        color: 'black',
                        border: 'none',
                        padding: '1rem',
                        borderRadius: '0px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(253, 185, 49, 0.3)',
                        transition: 'transform 0.2s',
                        display: 'block'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    GET LIFETIME ACCESS
                </a>
            </div>
        </div>
    );
}
