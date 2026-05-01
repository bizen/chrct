import { useMemo, useState } from 'react';

const STORAGE_KEY = 'chrct.count.text';

export function CountPage() {
  const [text, setText] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY) ?? '';
  });

  const stats = useMemo(() => {
    const chars = [...text].length;
    const charsNoSpace = [...text.replace(/\s/g, '')].length;
    const words = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
    const lines = text.length === 0 ? 0 : text.split(/\r?\n/).length;
    return { chars, charsNoSpace, words, lines };
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore storage failures (private mode, quota)
    }
  };

  const clear = () => {
    setText('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <h1 className="page-title">character count</h1>
        <button className="ghost-btn" onClick={clear} disabled={text.length === 0}>
          clear
        </button>
      </div>

      <div className="stat-row">
        <Stat label="characters" value={stats.chars} />
        <Stat label="no spaces" value={stats.charsNoSpace} />
        <Stat label="words" value={stats.words} />
        <Stat label="lines" value={stats.lines} />
      </div>

      <textarea
        className="count-textarea"
        placeholder="ここに文字を入力..."
        value={text}
        onChange={handleChange}
      />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
