import { useState, useEffect } from 'react';
import { Sparkles, Copy, Trash2, Sun, Moon, X } from 'lucide-react';

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

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const handleClear = () => {
    setText('');
  };

  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 'bold', fontSize: '1.25rem', letterSpacing: '-0.025em' }}>
          <Sparkles size={24} color="var(--accent-color)" fill="var(--accent-color)" />
          <span>chrct</span>
        </div>
        <nav style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
          <button
            onClick={() => setIsAboutOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
          >
            About
          </button>
        </nav>
      </header>

      <div style={{ borderBottom: '1px solid var(--border-color)', width: '100%', marginBottom: '1rem', opacity: 0.5 }}></div>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, width: '100%' }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <StatCard label="CHARACTERS" value={stats.characters} />
          <StatCard label="WORDS" value={stats.words} />
          <StatCard label="SENTENCES" value={stats.sentences} />
          <StatCard label="PARAGRAPHS" value={stats.paragraphs} />
          <StatCard label="SPACES" value={stats.spaces} />
        </div>
      </main>

      <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', padding: '2rem 0', width: '100%' }}>
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

      {isAboutOpen && (
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
        }} onClick={() => setIsAboutOpen(false)}>
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
              onClick={() => setIsAboutOpen(false)}
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

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>About chrct</h2>

            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p style={{ marginBottom: '1rem' }}>
                writing is the purest form of expression.
              </p>
              <p>
                chrct（ｷｬﾗｸﾄ） is a simple, beautiful, and functional writing environment.
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

export default App;
