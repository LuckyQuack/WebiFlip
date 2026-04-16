import { useEffect, useState } from 'react';
import './index.css';
import Home from './Components/Pages/Home';
import BoardPage from './Components/Pages/BoardPage';

const getCurrentView = () => {
  if (typeof window === 'undefined') {
    return 'editor';
  }

  return window.location.hash === '#board' ? 'board' : 'editor';
};

function App() {
  const [currentView, setCurrentView] = useState(getCurrentView);
  const [boardRefreshToken, setBoardRefreshToken] = useState(0);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(getCurrentView());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view) => {
    const nextHash = view === 'board' ? '#board' : '#editor';
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setCurrentView(view);
    }
  };

  const handlePostCreated = () => {
    setBoardRefreshToken((prev) => prev + 1);
    navigateTo('board');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-brand-mark">WEBIFLIP GIF BOARD</div>
          <h1 className="app-title">WebiFlip</h1>
        </div>
        <nav className="app-nav" aria-label="Primary">
          <button
            type="button"
            className={`app-nav-button ${currentView === 'editor' ? 'active' : ''}`}
            onClick={() => navigateTo('editor')}
          >
            Editor
          </button>
          <button
            type="button"
            className={`app-nav-button ${currentView === 'board' ? 'active' : ''}`}
            onClick={() => navigateTo('board')}
          >
            Board
          </button>
        </nav>
      </header>
      {currentView === 'board' ? (
        <BoardPage
          refreshToken={boardRefreshToken}
          onNavigateToEditor={() => navigateTo('editor')}
        />
      ) : (
        <Home
          onPostCreated={handlePostCreated}
          onNavigateToBoard={() => navigateTo('board')}
        />
      )}
    </div>
  );
}

export default App;
