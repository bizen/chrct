import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LandingPage } from './pages/LandingPage.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ConvexClientProvider } from './components/ConvexClientProvider.tsx'

const Main = () => {
  // Routing Logic
  // Production: app.chrct.com -> App, otherwise LandingPage
  // Localhost: /app -> App, otherwise LandingPage
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  let showApp = false;

  if (hostname.startsWith('app.')) {
    showApp = true;
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (pathname.startsWith('/app')) {
      showApp = true;
    }
  }

  if (showApp) {
    return (
      <div className="app-layout-wrapper">
        <div className="app-layout-container">
          <App />
        </div>
      </div>
    );
  }

  return <LandingPage />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexClientProvider>
        <Main />
      </ConvexClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
