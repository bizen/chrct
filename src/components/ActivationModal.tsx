import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { PricingCards } from './PricingCards';

interface ActivationModalProps {
    isOpen: boolean;
    onActivate: (key: string) => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
}

export function ActivationModal({ isOpen, onActivate, isLoading, error }: ActivationModalProps) {
    const [key, setKey] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            onActivate(key.trim());
        }
    };

    // Pricing Links migrated to PricingCards component

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(18, 22, 32, 0.95)',
            backdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div style={{
                maxWidth: '900px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3rem'
            }}>

                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <Sparkles size={40} className="text-blue-400" color="#60A5FA" fill="#60A5FA" />
                        <span style={{ fontSize: '3rem', fontWeight: 'bold', letterSpacing: '-0.05em' }}>chrct</span>
                    </div>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                        Unlock the ultimate writing environment.
                    </p>
                </div>


                {/* Pricing Cards */}
                <PricingCards />

                {/* Activation Section */}

                {/* Activation Section */}
                <div style={{
                    width: '100%',
                    maxWidth: '500px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    marginTop: '1rem',
                    padding: '2rem',
                    borderRadius: '16px',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Have a License Key?</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Enter your key from the email to activate.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Enter License Key (e.g. AAAA-BBBB-CCCC-DDDD)"
                            value={key}
                            onChange={(e) => {
                                setKey(e.target.value);
                            }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-color)',
                                padding: '1rem',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none',
                                textAlign: 'center',
                                letterSpacing: '0.05em'
                            }}
                        />

                        <button
                            type="submit"
                            disabled={isLoading || !key.trim()}
                            style={{
                                background: 'var(--text-primary)',
                                color: 'var(--bg-color)',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: 'bold',
                                cursor: isLoading ? 'wait' : 'pointer',
                                opacity: (!key.trim() || isLoading) ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                            {isLoading ? 'Activating...' : 'Activate License'}
                        </button>
                    </form>

                    {error && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#ef4444',
                            fontSize: '0.9rem',
                            justifyContent: 'center',
                            marginTop: '0.5rem'
                        }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
