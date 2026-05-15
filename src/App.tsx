import { useEffect, useState } from 'react';
import './index.css';
import Home from './Components/Pages/Home';
import BoardPage from './Components/Pages/BoardPage';
import type { BoardPost } from './types';

type View = 'editor' | 'board';

const getCurrentView = (): View =>
  typeof window !== 'undefined' && window.location.hash === '#board' ? 'board' : 'editor';

function App() {
  const [currentView, setCurrentView] = useState<View>(getCurrentView);
  const [boardRefreshToken, setBoardRefreshToken] = useState(0);

  useEffect(() => {
    const handleHashChange = () => setCurrentView(getCurrentView());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: View) => {
    const nextHash = view === 'board' ? '#board' : '#editor';
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setCurrentView(view);
    }
  };

  const handlePostCreated = (_post: BoardPost) => {
    setBoardRefreshToken((prev) => prev + 1);
    navigateTo('board');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
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
      <div hidden={currentView !== 'editor'}>
        <Home
          isActive={currentView === 'editor'}
          onPostCreated={handlePostCreated}
          onNavigateToBoard={() => navigateTo('board')}
        />
      </div>
      {currentView === 'board' ? (
        <BoardPage
          refreshToken={boardRefreshToken}
          onNavigateToEditor={() => navigateTo('editor')}
        />
      ) : null}
    </div>
  );
}

export default App;
