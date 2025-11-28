import { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, Trash2, Sun, Moon, X, Image as ImageIcon, FileText, Printer, Share2, Download, Snowflake } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { Analytics } from '@vercel/analytics/react';
import cirnoImg from './assets/cirno.png';
import bgImg from './assets/cirno-daiyosei-landscape.jpeg';
import shareBgImg from './assets/sharecard_landscape.png';
import { playTypeSound } from './utils/sound';
import { useStreak } from './hooks/useStreak';

function App() {
  const [text, setText] = useState(() => {
    return localStorage.getItem('chrct_text') || '';
  });
  const [stats, setStats] = useState({
    characters: 0,
    words: 0,
    sentences: 0,
    paragraphs: 0,
    spaces: 0,
  });
  const [hasTyped, setHasTyped] = useState(false);

  const { streak, isCompletedToday, dailyProgress } = useStreak(stats.characters);

  const [theme, setTheme] = useState<'dark' | 'light' | 'wallpaper'>('dark');
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Header interaction states
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [headerPrefix, setHeaderPrefix] = useState<'chrct' | 'chiruno' | 'character'>('chrct');
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Share modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('chrct_text', text);
    setLastSaved(new Date());
  }, [text]);

  // Popup animation states
  const [popups, setPopups] = useState<{ id: number; text: string; xOffset: number }[]>([]);
  const lastPopupTime = useRef(0);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const themeValue = theme === 'wallpaper' ? 'dark' : theme;
    document.documentElement.setAttribute('data-theme', themeValue);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'dark') return 'wallpaper';
      if (prev === 'wallpaper') return 'light';
      return 'dark';
    });
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
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isHeaderHovered) {
      setHeaderPrefix('chiruno');
      interval = setInterval(() => {
        setHeaderPrefix(prev => prev === 'chiruno' ? 'character' : 'chiruno');
      }, 2000); // Switch every 2 seconds
    } else {
      setHeaderPrefix('chrct');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
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
    if (!hasTyped) setHasTyped(true);

    // Only trigger popup if text length increased (typing)
    if (newText.length > text.length) {
      playTypeSound(); // Play typing sound

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

  const handleExportDocx = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: text.split('\n').map(line => new Paragraph({
          children: [new TextRun(line)],
          spacing: { after: 200 }, // Add some spacing between paragraphs
        })),
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "chrct_export.docx");
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!shareRef.current) return;

    try {
      // Ensure fonts are loaded
      await document.fonts.ready;

      const canvas = await html2canvas(shareRef.current, {
        useCORS: true,
        scale: 2, // High resolution
        backgroundColor: '#1a1a1a', // Fallback
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        setShareImageBlob(blob);
        setIsShareModalOpen(true);
      }, 'image/png');
    } catch (err) {
      console.error('Capture failed:', err);
    }
  };

  const handleDownloadImage = () => {
    if (!shareImageBlob) return;
    saveAs(shareImageBlob, 'chrct-stats.png');
  };

  const handleNativeShare = async () => {
    if (!shareImageBlob) return;
    const file = new File([shareImageBlob], 'chrct-stats.png', { type: 'image/png' });

    // Check if sharing is supported and if the file can be shared
    // Cast to any to avoid TS warning about "always defined"
    const nav = navigator as any;
    const canShare = nav.share &&
      (typeof nav.canShare === 'function' ? nav.canShare({ files: [file] }) : false);

    if (canShare) {
      try {
        await nav.share({
          files: [file],
          title: 'My Writing Progress on chrct',
          text: `I wrote ${stats.characters} characters today! #chrct #writing`,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <>
      <Analytics />
      {/* Hidden Share Card for Capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div
          ref={shareRef}
          style={{
            width: '1080px',
            height: '1080px',
            position: 'relative',
            backgroundColor: '#1a1a1a',
            color: 'white',
            fontFamily: "'Space Grotesk', sans-serif",
            overflow: 'hidden',
          }}
        >
          {/* Background Image with Overlay */}
          <img
            src={shareBgImg}
            alt="Background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.6,
            }}
          />

          {/* Content Container */}
          <div style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '3rem',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <Sparkles size={80} color="#60A5FA" fill="#60A5FA" />
              <span style={{ fontSize: '5rem', fontWeight: 'bold', letterSpacing: '-0.05em' }}>chrct</span>
            </div>

            {/* Main Stats */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16rem', fontWeight: 700, lineHeight: 1, color: '#60A5FA', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {stats.characters.toLocaleString()}
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 500, color: '#e5e7eb', letterSpacing: '0.1em', marginTop: '1.5rem' }}>
                CHARACTERS
              </div>
            </div>

            {/* Sub Stats Grid */}
            <div style={{ display: 'flex', gap: '6rem', marginTop: '3rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', fontWeight: 700 }}>{stats.words}</div>
                <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>WORDS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', fontWeight: 700 }}>{stats.sentences}</div>
                <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>SENTENCES</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', fontWeight: 700 }}>{stats.paragraphs}</div>
                <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>PARAGRAPHS</div>
              </div>
            </div>

            {/* Footer URL */}
            <div style={{ position: 'absolute', bottom: '3rem', fontSize: '2rem', opacity: 1, letterSpacing: '0.05em' }}>
              chrct.com
            </div>
          </div>
        </div>
      </div>

      {/* Background Layer */}
      <div className={`wallpaper-container ${theme === 'wallpaper' ? 'visible' : ''}`}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url(${bgImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)', // Default blur
          transform: 'scale(1.1)', // Prevent blur edges
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dark overlay
        }} />
      </div>

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
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
          <div
            className={`streak-badge ${isCompletedToday ? 'completed' : ''}`}
            title={isCompletedToday ? "Streak kept! Come back tomorrow." : "Write 100 characters to keep the streak!"}
            style={{ padding: '0.25rem 1rem' }}
          >
            <Snowflake size={20} className="streak-icon" />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, alignItems: 'flex-start' }}>
              <span>{streak} day{streak !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 400 }}>{dailyProgress} chars</span>
            </div>
          </div>
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

      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '2rem 0', width: '100%' }} className="animate-in delay-400">
        {/* Left: Export Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleExportDocx} title="Export to Word (.docx)" className="icon-btn">
            <FileText size={20} />
          </button>
          <button onClick={handlePrintPdf} title="Print / Save as PDF" className="icon-btn">
            <Printer size={20} />
          </button>
          <button onClick={handleShare} title="Share Progress" className="icon-btn">
            <Share2 size={20} />
          </button>
        </div>

        {/* Right: Timestamp & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          {lastSaved && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8, fontFamily: 'monospace' }}>
              Saved {lastSaved.getMonth() + 1}/{lastSaved.getDate()} {lastSaved.getHours().toString().padStart(2, '0')}:{lastSaved.getMinutes().toString().padStart(2, '0')}
            </span>
          )}
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button onClick={handleCopy} title="Copy" className="icon-btn">
              <Copy size={20} />
            </button>
            <button onClick={handleClear} title="Clear" className="icon-btn">
              <Trash2 size={20} />
            </button>
            <button onClick={toggleTheme} title="Toggle Theme" className="icon-btn">
              {theme === 'dark' ? <ImageIcon size={20} /> : theme === 'wallpaper' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
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
              あたいが文字数をかぞえるよ！<br />Let me count the words for you!
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

      {/* Share Modal */}
      {isShareModalOpen && shareImageBlob && (
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
          onClick={() => setIsShareModalOpen(false)}
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
              onClick={() => setIsShareModalOpen(false)}
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
                src={URL.createObjectURL(shareImageBlob)}
                alt="Share Preview"
                style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleDownloadImage}
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

              {(navigator as any).share && (
                <button
                  onClick={handleNativeShare}
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
      )}

      {/* Credit Modal */}
      {
        isCreditOpen && (
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
        )
      }
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
