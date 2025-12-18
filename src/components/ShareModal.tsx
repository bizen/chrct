import { X, Download, Share2 } from 'lucide-react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageBlob: Blob | null;
    onDownload: () => void;
    onShare: () => void;
    canShare: boolean;
}

export function ShareModal({ isOpen, onClose, imageBlob, onDownload, onShare, canShare }: ShareModalProps) {
    if (!isOpen || !imageBlob) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(5px)',
            }}
            onClick={onClose}
            className="animate-in"
        >
            <div
                style={{
                    backgroundColor: 'var(--card-bg)',
                    padding: '2rem',
                    borderRadius: '16px',
                    maxWidth: '90%',
                    maxHeight: '90%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border-color)',
                }}
                onClick={e => e.stopPropagation()}
            >
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
                    <X size={24} />
                </button>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}>Share Progress</h2>

                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img
                        src={URL.createObjectURL(imageBlob)}
                        alt="Share Preview"
                        style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        onClick={onDownload}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 500,
                            transition: 'background-color 0.2s',
                        }}
                        className="hover-bg"
                    >
                        <Download size={20} />
                        Download
                    </button>

                    {canShare && (
                        <button
                            onClick={onShare}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#60A5FA',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 500,
                                transition: 'opacity 0.2s',
                            }}
                            className="hover-opacity"
                        >
                            <Share2 size={20} />
                            Share
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
