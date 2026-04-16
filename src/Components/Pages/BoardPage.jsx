import React, { useEffect, useState } from 'react';
import GifBoardGrid from '../GifBoardGrid';
import { listBoardPosts } from '../../utils/gifBoard';

const BoardPage = ({ refreshToken, onNavigateToEditor }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);

  const loadPosts = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const nextPosts = await listBoardPosts();
      setPosts(nextPosts);
    } catch (error) {
      console.error('Board fetch failed:', error);
      setErrorMessage(error.message || 'Could not load the board right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [refreshToken]);

  return (
    <main className="board-page">
      <section className="board-page-header">
        <div>
          <div className="board-page-kicker">DENSE PUBLIC GIF WALL</div>
          <h2 className="board-page-title">GIF Board</h2>
          <p className="board-page-copy">
            Fresh flips from the editor land here. Tiles stay tight, metadata stays tiny,
            and the wall updates from Supabase storage plus the board table.
          </p>
        </div>
        <div className="board-page-actions">
          <button type="button" className="board-action-button" onClick={loadPosts} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button type="button" className="board-action-button accent" onClick={onNavigateToEditor}>
            New Post
          </button>
        </div>
      </section>

      {errorMessage ? (
        <section className="board-status-panel">
          <p>{errorMessage}</p>
        </section>
      ) : null}

      {!errorMessage && isLoading ? (
        <section className="board-status-panel">
          <p>Loading board posts...</p>
        </section>
      ) : null}

      {!errorMessage && !isLoading && posts.length === 0 ? (
        <section className="board-status-panel">
          <p>No GIFs have been posted yet. Make the first one from the editor.</p>
        </section>
      ) : null}

      {!errorMessage && posts.length > 0 ? (
        <GifBoardGrid posts={posts} onSelectPost={setSelectedPost} />
      ) : null}

      {selectedPost ? (
        <div className="dialog-backdrop" role="presentation" onClick={() => setSelectedPost(null)}>
          <div
            className="dialog-panel board-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="board-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-header">
              <div>
                <div className="dialog-kicker">BOARD DETAIL</div>
                <h3 id="board-detail-title" className="dialog-title">{selectedPost.title}</h3>
              </div>
              <button type="button" className="dialog-close" onClick={() => setSelectedPost(null)}>
                Close
              </button>
            </div>
            <img src={selectedPost.gifUrl} alt={selectedPost.title} className="board-detail-image" />
            <div className="board-detail-meta">
              <span>{selectedPost.author || 'anonymous'}</span>
              <span>{selectedPost.frameCount} frames</span>
              <span>{selectedPost.fps} fps</span>
              <span>{selectedPost.width}x{selectedPost.height}</span>
            </div>
            {selectedPost.caption ? (
              <p className="board-detail-caption">{selectedPost.caption}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default BoardPage;
