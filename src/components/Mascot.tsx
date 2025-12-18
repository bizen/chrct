import { X } from 'lucide-react';
import cirnoImg from '../assets/cirno.png';

interface Popup {
    id: number;
    text: string;
    xOffset: number;
}

interface MascotProps {
    popups: Popup[];
    isAboutOpen: boolean;
    onToggleAbout: () => void;
}

export function Mascot({ popups, isAboutOpen, onToggleAbout }: MascotProps) {
    return (
        <div className="mascot-container animate-in delay-500">
            {popups.map(popup => (
                <div
                    key={popup.id}
                    className="popup-text"
                    style={{ transform: `translateX(calc(-50% + ${popup.xOffset}px))` }}
                >
                    {popup.text}
                </div>
            ))}
            {isAboutOpen && (
                <div className="speech-bubble">
                    <button
                        onClick={onToggleAbout}
                        className="close-bubble"
                    >
                        <X size={16} />
                    </button>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>チルノカウントについて</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        あたいが文字数をかぞえるよ！<br />Let me count the words for you!
                    </p>
                </div>
            )}
            <img
                src={cirnoImg}
                alt="Cirno"
                className="mascot"
                onClick={onToggleAbout}
            />
        </div>
    );
}
