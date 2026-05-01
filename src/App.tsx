import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Mascot } from './components/Mascot';
import { SplashScreen } from './components/SplashScreen';
import { CountPage } from './pages/CountPage';
import { TasksPage } from './pages/TasksPage';

const SPLASH_VISIBLE_MS = 1100;
const SPLASH_FADE_MS = 450;

export default function App() {
  const [splashState, setSplashState] = useState<'visible' | 'fading' | 'gone'>('visible');

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashState('fading'), SPLASH_VISIBLE_MS);
    const goneTimer = setTimeout(
      () => setSplashState('gone'),
      SPLASH_VISIBLE_MS + SPLASH_FADE_MS
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  return (
    <>
      {splashState !== 'gone' && <SplashScreen fadingOut={splashState === 'fading'} />}

      <div className="app-shell">
        <header className="app-header">
          <div className="brand">chrct</div>
          <nav className="app-nav">
            <NavLink to="/count" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              count
            </NavLink>
            <NavLink to="/tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              tasks
            </NavLink>
          </nav>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/count" replace />} />
            <Route path="/count" element={<CountPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="*" element={<Navigate to="/count" replace />} />
          </Routes>
        </main>

        <Mascot />
      </div>
    </>
  );
}
