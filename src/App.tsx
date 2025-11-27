import { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, Trash2, Sun, Moon, X } from 'lucide-react';
import cirnoImg from './assets/cirno.png';

function App() {
  const [text, setText] = useState('');
  const [stats, setStats] = useState({
    characters: 0,
    words: 0,
    sentences: 0,
    paragraphs: 0,
    spaces: 0,
  });
  const [theme, setTheme] = useState('dark');
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Header interaction states
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [headerPrefix, setHeaderPrefix] = useState<'chrct' | 'chiruno' | 'character'>('chrct');
  const [isCreditOpen, setIsCreditOpen] = useState(false);

  // Popup animation states
  const [popups, setPopups] = useState<{ id: number; text: string; xOffset: number }[]>([]);
  const lastPopupTime = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const characters = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const sentences = text.trim() === '' ? 0 : text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = text.trim() === '' ? 0 : text.split(/\n+/).filter(p => p.trim().length > 0).length;
    const spaces = (text.match(/\s/g) || []).length;

    setStats({ characters, words, sentences, paragraphs, spaces });
  }, [text]);

  // Header text rotation logic
  useEffect(() => {
    let interval: number;
    if (isHeaderHovered) {
      // Start with chiruno immediately or keep current? 
      // Let's start with chiruno
      setHeaderPrefix('chiruno');
      interval = setInterval(() => {
        setHeaderPrefix(prev => prev === 'chiruno' ? 'character' : 'chiruno');
      }, 2000); // Switch every 2 seconds
    } else {
      setHeaderPrefix('chrct');
    }
    return () => clearInterval(interval);
  }, [isHeaderHovered]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const handleClear = () => {
    setText('');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    // Only trigger popup if text length increased (typing)
    if (newText.length > text.length) {
      const now = Date.now();
      if (now - lastPopupTime.current > 500) { // Throttle: every 500ms
        const messages = ["!!", "やるね!", "天才!", "最強!", "あたいの次に!", "すご!", "Good!", "Nice!", "ゴー!"];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        const id = now;
        const xOffset = Math.random() * 60 - 30; // Random offset between -30px and 30px

        setPopups(prev => [...prev, { id, text: randomMsg, xOffset }]);
        lastPopupTime.current = now;

        // Remove popup after animation
        setTimeout(() => {
          setPopups(prev => prev.filter(p => p.id !== id));
        }, 1200);
      }
    }
  };

  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', width: '100%' }} className="animate-in">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 'bold', fontSize: '1.25rem', letterSpacing: '-0.025em', cursor: 'default' }}
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
        >
          <Sparkles size={24} color="var(--accent-color)" fill="var(--accent-color)" />
          <div className="logo-text">
            {/* Part 1: ch */}
            <span className="logo-static" style={{ color: isHeaderHovered ? '#60A5FA' : 'var(--text-primary)' }}>ch</span>

            {/* Part 2: i / a */}
            <AnimatedPart isVisible={isHeaderHovered} text={headerPrefix === 'chiruno' ? 'i' : 'a'} color="#60A5FA" />

            {/* Part 3: r */}
            <span className="logo-static" style={{ color: isHeaderHovered ? '#60A5FA' : 'var(--text-primary)' }}>r</span>

            {/* Part 4: uno / acter */}
            <AnimatedPart isVisible={isHeaderHovered} text={headerPrefix === 'chiruno' ? 'uno' : 'acter'} color="#60A5FA" />

            {/* Part 5: c (start of count) */}
            <span className="logo-static" style={{ color: 'var(--text-primary)' }}>c</span>

            {/* Part 6: oun */}
            <AnimatedPart isVisible={isHeaderHovered} text="oun" color="var(--text-primary)" />

            {/* Part 7: t */}
            <span className="logo-static" style={{ color: 'var(--text-primary)' }}>t</span>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
          <button
            onClick={() => setIsCreditOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              cursor: 'pointer',
              padding: 0
            }}
            className="nav-link"
          >
            Credit
          </button>
        </nav>
      </header>

      <div style={{ borderBottom: '1px solid var(--border-color)', width: '100%', marginBottom: '1rem', opacity: 0.5 }} className="animate-in delay-100"></div>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, width: '100%' }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }} className="animate-in delay-200">
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Start typing here..."
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: '400px',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'var(--text-primary)',
              fontSize: '1.1rem',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }} className="animate-in delay-300">
          <StatCard label="CHARACTERS" value={stats.characters} />
          <StatCard label="WORDS" value={stats.words} />
          <StatCard label="SENTENCES" value={stats.sentences} />
          <StatCard label="PARAGRAPHS" value={stats.paragraphs} />
          <StatCard label="SPACES" value={stats.spaces} />
        </div>
      </main>

      <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', padding: '2rem 0', width: '100%' }} className="animate-in delay-400">
        <button onClick={handleCopy} title="Copy" className="icon-btn">
          <Copy size={20} />
        </button>
        <button onClick={handleClear} title="Clear" className="icon-btn">
          <Trash2 size={20} />
        </button>
        <button onClick={toggleTheme} title="Toggle Theme" className="icon-btn">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </footer>

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
              onClick={() => setIsAboutOpen(false)}
              className="close-bubble"
            >
              <X size={16} />
            </button>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>チルノカウントについて</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              あたいが文字数をかぞえるよ！<br />Let me count the words!
            </p>
          </div>
        )}
        <img
          src={cirnoImg}
          alt="Cirno"
          className="mascot"
          onClick={() => setIsAboutOpen(!isAboutOpen)}
        />
      </div>

      {isCreditOpen && (
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
        }} onClick={() => setIsCreditOpen(false)}>
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
              onClick={() => setIsCreditOpen(false)}
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

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Credit</h2>

            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              <p style={{ marginBottom: '1rem' }}>
                本サービスは「東方Project」の二次創作です。<br />
                原作者である「上海アリス幻樂団」様およびZUN氏とは一切関係ありません。
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      minWidth: '0',
    }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span className="stat-card-value" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-color)', lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

function AnimatedPart({ isVisible, text, color }: { isVisible: boolean; text: string; color: string }) {
  return (
    <span
      className={`anim-part ${isVisible ? 'visible' : ''}`}
      style={{ color }}
    >
      <span key={text} className="anim-content">
        {text}
      </span>
    </span>
  );
}

export default App;
