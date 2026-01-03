import { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, Trash2, FileText, Printer, Share2, Snowflake, LayoutGrid } from 'lucide-react';
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react";
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

import { Analytics } from '@vercel/analytics/react';

// Assets
import bgImg from './assets/cirno-daiyosei-landscape.jpeg';
import shareBgImg from './assets/sharecard_landscape.png';
import chirunoMp3 from './assets/chiruno.mp3';

// Components
import { HubSidebar } from './components/HubSidebar';
import { RightHubSidebar } from './components/RightHubSidebar';
import { CharacterCountView } from './components/views/CharacterCountView';
import { TaskListView } from './components/views/TaskListView';
import { CreditModal } from './components/CreditModal';
import { ShareModal } from './components/ShareModal';
import { Mascot } from './components/Mascot';
import { RefreshCw } from 'lucide-react';

// Utils / Hooks
import { playTypeSound } from './utils/sound';
import { useStreak } from './hooks/useStreak';
import { useCloudSync } from './hooks/useCloudSync';

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const { streak, isCompletedToday, dailyProgress } = useStreak();

  // Cloud Sync
  const { saveStatus } = useCloudSync(text, setText);

  // Theme state - default to wallpaper
  const [theme, setTheme] = useState<'dark' | 'light' | 'wallpaper'>(() => {
    const saved = localStorage.getItem('chrct_theme');
    return (saved as 'dark' | 'light' | 'wallpaper') || 'wallpaper';
  });
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(() => {
    const saved = localStorage.getItem('chrct_hub_open');
    return saved ? JSON.parse(saved) : false;
  });

  // Header interaction states
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [headerPrefix, setHeaderPrefix] = useState<'chrct' | 'chiruno' | 'character'>('chrct');
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Zen Mode state
  const [isZenMode, setIsZenMode] = useState(false);
  const [zenFlash, setZenFlash] = useState(false);

  // Share modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('chrct_music_volume');
    return saved ? parseFloat(saved) : 0.1;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // View Mode state
  const [viewMode, setViewMode] = useState<'charCount' | 'taskList'>(() => {
    const saved = localStorage.getItem('chrct_view_mode');
    return (saved as 'charCount' | 'taskList') || 'charCount';
  });

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'charCount' ? 'taskList' : 'charCount');
  };

  useEffect(() => {
    localStorage.setItem('chrct_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    audioRef.current = new Audio(chirunoMp3);
    audioRef.current.loop = true;
    audioRef.current.volume = musicVolume;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (newVolume: number) => {
    setMusicVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    localStorage.setItem('chrct_music_volume', newVolume.toString());
  };

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
    localStorage.setItem('chrct_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('chrct_hub_open', JSON.stringify(isHubOpen));
  }, [isHubOpen]);

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

  const toggleZenMode = () => {
    if (!isZenMode) {
      setZenFlash(true);
      setTimeout(() => setZenFlash(false), 500);
    }
    setIsZenMode(!isZenMode);
    // Close Hub if open
    if (!isZenMode && isHubOpen) {
      setIsHubOpen(false);
    }
  };

  const canShare = (navigator as any).share &&
    (typeof (navigator as any).canShare === 'function' ? (navigator as any).canShare({ files: [new File([], 'test.png')] }) : false) || false;

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Zen Mode Flash Effect */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#BAE6FD',
          opacity: zenFlash ? 0.3 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.5s ease-out',
          zIndex: 9999,
        }}
      />
      <Analytics />


      {/* Main Content Wrapper */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        position: 'relative',
        transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)', // Smooth resize
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          boxSizing: 'border-box', // Ensure padding doesn't overflow width
          gap: '2rem',
          flex: 1,
        }}>


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

          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', width: '100%', transition: 'all 0.5s ease' }} className="animate-in">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                letterSpacing: '-0.025em',
                cursor: 'default',
              }}
              className={isZenMode ? 'zen-hidden' : ''}
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

            <nav className={`header-actions ${isZenMode ? 'zen-hidden' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>

              {/* Streak Badge - Compact on Mobile */}
              <div
                className={`streak-badge ${isCompletedToday ? 'completed' : ''}`}
                title={isCompletedToday ? "Streak kept! Come back tomorrow." : "Write 100 characters to keep the streak!"}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  // padding handled by CSS class for responsiveness
                }}
              >
                <Snowflake size={20} className="streak-icon" />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, alignItems: 'flex-start' }}>
                  <span>{streak}<span className="mobile-hidden"> day{streak !== 1 ? 's' : ''}</span></span>
                  <span className="streak-details" style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 400 }}>{dailyProgress} tasks</span>
                </div>
              </div>

              <button
                onClick={() => setIsHubOpen(!isHubOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s',
                }}
                className="hover-bg"
                title="Open Hub"
              >
                <LayoutGrid size={20} />
              </button>

              <button
                onClick={toggleViewMode}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s',
                }}
                className="hover-bg"
                title={viewMode === 'charCount' ? "Switch to Task List" : "Switch to Character Count"}
              >
                <RefreshCw size={20} />
              </button>

              <button
                onClick={() => setIsCreditOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  font: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                }}
                className="nav-link mobile-hidden"
              >
                Credit
              </button>

              {/* ⑨ Mode Button */}
              <button
                onClick={toggleZenMode}
                className={`zen-button ${isZenMode ? 'active' : ''}`}
                title={isZenMode ? "Exit Zen Mode" : "Enter ⑨ Mode (Zen)"}
              >
                9
              </button>

              <div style={{ marginLeft: '0.25rem' }}>
                <SignedIn>
                  <UserButton />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="sign-in-btn">
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            </nav>
          </header>

          <div style={{
            borderBottom: '1px solid var(--border-color)',
            width: '100%',
            marginBottom: '1rem',
            opacity: 0.5,
          }} className={`animate-in delay-100 ${isZenMode ? 'zen-hidden' : ''}`}></div>

          <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, width: '100%', position: 'relative' }}>
            {viewMode === 'charCount' ? (
              <CharacterCountView
                text={text}
                handleTextChange={handleTextChange}
                stats={stats}
                isZenMode={isZenMode}
                saveStatus={saveStatus}
              />
            ) : (
              <TaskListView theme={theme} />
            )}
          </main>

          <footer style={{
            display: viewMode === 'charCount' ? 'flex' : 'none',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'center' : 'flex-end',
            padding: '2rem 0',
            width: '100%',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '1rem' : '0'
          }} className={`animate-in delay-400 ${isZenMode ? 'zen-hidden' : ''}`}>
            {/* Left: Export Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: isMobile ? 'center' : 'flex-start', width: isMobile ? '100%' : 'auto' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
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
              </div>
            </div>
          </footer>

          {!isMobile && (
            <Mascot popups={popups} isAboutOpen={isAboutOpen} onToggleAbout={() => setIsAboutOpen(!isAboutOpen)} />
          )}

          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            imageBlob={shareImageBlob}
            onDownload={handleDownloadImage}
            onShare={handleNativeShare}
            canShare={canShare}
          />

          <CreditModal isOpen={isCreditOpen} onClose={() => setIsCreditOpen(false)} />

          <HubSidebar
            isOpen={isHubOpen}
            onClose={() => setIsHubOpen(false)}
            theme={theme}
            setTheme={setTheme}
            isMusicPlaying={isPlaying}
            toggleMusic={toggleMusic}
            musicVolume={musicVolume}
            onVolumeChange={handleVolumeChange}
            viewMode={viewMode}
            text={text}
            handleTextChange={handleTextChange}
            handleTextChange={handleTextChange}
            stats={stats}
            saveStatus={saveStatus}
          />
          {/* Right Hub Sidebar */}
          <RightHubSidebar
            isOpen={isHubOpen}
            onClose={() => setIsHubOpen(false)}
            theme={theme}
          />

        </div>
      </div>
      {/* Animated Header Part Component */}
    </div>
  );
}

// Subcomponent for animated header parts
function AnimatedPart({ isVisible, text, color }: { isVisible: boolean; text: string; color: string }) {
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

  // Reset state when not visible to ensure clean slate on next hover
  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => {
        setPreviousText(null);
        setCurrentText(text);
      }, 500); // Wait for close animation
      return () => clearTimeout(timer);
    }
  }, [isVisible, text]);

  return (
    <span
      className="logo-animated"
      style={{
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
      {previousText && (
        <span className="slide-out-up" style={{ color }}>{previousText}</span>
      )}
      <span className={previousText ? "slide-in-up" : ""} key={currentText}>
        {currentText}
      </span>
    </span>
  );
}

export default App;
