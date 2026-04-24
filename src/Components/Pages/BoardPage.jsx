import React, { useEffect, useState } from 'react';
import GifBoardGrid from '../GifBoardGrid';
import { listBoardPosts } from '../../utils/gifBoard';
import { downloadBlob, getGifExportFileName } from '../../utils/gifExport';

const BoardPage = ({ refreshToken, onNavigateToEditor }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isDownloadingGif, setIsDownloadingGif] = useState(false);

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

  const handleDownloadSelectedPost = async () => {
    if (!selectedPost?.gifUrl || isDownloadingGif) {
      return;
    }

    setIsDownloadingGif(true);

    try {
      const response = await fetch(selectedPost.gifUrl);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}.`);
      }

      const blob = await response.blob();
      downloadBlob(blob, getGifExportFileName(selectedPost.title || 'webiflip-board-post'));
    } catch (error) {
      console.error('GIF download failed:', error);
      window.alert('Could not download this GIF right now. Please try again.');
    } finally {
      setIsDownloadingGif(false);
    }
  };

  return (
    <main className="board-page">
      <section className="board-page-header">
        <div>
          <h2 className="board-page-title">GIF Board</h2>
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
              <button
                type="button"
                className="board-detail-download"
                onClick={handleDownloadSelectedPost}
                disabled={isDownloadingGif}
              >
                {isDownloadingGif ? 'Downloading...' : 'Download GIF'}
              </button>
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
