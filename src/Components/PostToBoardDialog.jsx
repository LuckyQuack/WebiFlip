import React, { useEffect, useState } from 'react';

const PostToBoardDialog = ({
  open,
  previewUrl,
  exportMeta,
  initialTitle,
  initialCaption,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [postTitle, setPostTitle] = useState(initialTitle || '');
  const [author, setAuthor] = useState('');
  const [caption, setCaption] = useState(initialCaption || '');

  useEffect(() => {
    if (!open) return;

    setPostTitle(initialTitle || '');
    setCaption(initialCaption || '');
    setAuthor('');
  }, [open, initialTitle, initialCaption]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isSubmitting, onClose]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      postTitle,
      author,
      caption,
    });
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={!isSubmitting ? onClose : undefined}>
      <div
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-to-board-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <div>
            <div className="dialog-kicker">ANONYMOUS BOARD POST</div>
            <h2 id="post-to-board-title" className="dialog-title">Post to Board</h2>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} disabled={isSubmitting}>
            Close
          </button>
        </div>
        <form className="dialog-form" onSubmit={handleSubmit}>
          <div className="dialog-preview">
            {previewUrl ? <img src={previewUrl} alt="GIF preview" className="dialog-preview-image" /> : null}
            {exportMeta ? (
              <div className="dialog-meta-strip">
                <span>{exportMeta.frameCount} frames</span>
                <span>{exportMeta.fps} fps</span>
                <span>{exportMeta.width}x{exportMeta.height}</span>
              </div>
            ) : null}
          </div>
          <label className="dialog-field">
            <span>Title</span>
            <input
              type="text"
              value={postTitle}
              onChange={(event) => setPostTitle(event.target.value)}
              maxLength={80}
              placeholder="Untitled flip"
              required
            />
          </label>
          <label className="dialog-field">
            <span>Author (optional)</span>
            <input
              type="text"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              maxLength={40}
              placeholder="anonymous"
            />
          </label>
          <label className="dialog-field">
            <span>Caption (optional)</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={240}
              placeholder="A tiny note for the board"
              rows="4"
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="dialog-secondary-button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="dialog-primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Post GIF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostToBoardDialog;
