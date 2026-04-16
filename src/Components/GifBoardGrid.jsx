import React from 'react';

const formatBoardDate = (createdAt) => {
  if (!createdAt) {
    return 'just now';
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return 'just now';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const GifBoardGrid = ({ posts, onSelectPost }) => {
  return (
    <div className="board-grid">
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          className="board-tile"
          onClick={() => onSelectPost(post)}
        >
          <img src={post.gifUrl} alt={post.title} className="board-tile-image" loading="lazy" />
          <div className="board-tile-overlay">
            <div className="board-tile-title">{post.title}</div>
            <div className="board-tile-meta">
              <span>{post.author || 'anonymous'}</span>
              <span>{post.frameCount} fr</span>
              <span>{formatBoardDate(post.createdAt)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default GifBoardGrid;
