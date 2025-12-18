import { X } from 'lucide-react';

interface CreditModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreditModal({ isOpen, onClose }: CreditModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem',
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '500px',
                width: '100%',
                position: 'relative',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                    }}
                >
                    <X size={20} />
                </button>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Credits</h2>

                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    <p style={{ marginBottom: '1rem' }}>
                        全ての人に最強の環境を！<br /><br />

                        Original Work:<br />
                        Touhou Project (Team Shanghai Alice / ZUN)<br /><br />

                        Music:<br />
                        TAMUSIC (TAM)<br /><br />

                        Disclaimer:<br />
                        本サービスは「東方Project」の二次創作です。<br />
                        原作者である「上海アリス幻樂団」様およびZUN氏とは一切関係ありません。

                    </p>
                </div>
            </div>
        </div>
    );
}
