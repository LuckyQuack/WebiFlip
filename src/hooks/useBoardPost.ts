import { useCallback, useEffect, useRef, useState } from 'react';
import { createBoardPost } from '../utils/gifBoard';
import type { BoardPost, GifExportResult, PendingBoardExport } from '../types';

const RATE_LIMIT_MS = 60_000;

interface UseBoardPostProps {
  buildGifExport: () => GifExportResult | null;
  onPostCreated?: (post: BoardPost) => void;
  onNavigateToBoard?: () => void;
}

interface UseBoardPostReturn {
  isPostingToBoard: boolean;
  isPostDialogOpen: boolean;
  pendingBoardExport: PendingBoardExport | null;
  submitError: string;
  handleOpenPostDialog: () => void;
  handleSubmitBoardPost: (fields: { postTitle: string; author: string; caption: string }) => Promise<void>;
  closePostDialog: () => void;
}

export const useBoardPost = ({
  buildGifExport,
  onPostCreated,
  onNavigateToBoard,
}: UseBoardPostProps): UseBoardPostReturn => {
  const [isPostingToBoard, setIsPostingToBoard] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [pendingBoardExport, setPendingBoardExport] = useState<PendingBoardExport | null>(null);
  const [submitError, setSubmitError] = useState('');
  const boardPreviewUrlRef = useRef<string | null>(null);
  const lastPostTimeRef = useRef(0);

  const revokePreviewUrl = () => {
    if (boardPreviewUrlRef.current) {
      URL.revokeObjectURL(boardPreviewUrlRef.current);
      boardPreviewUrlRef.current = null;
    }
  };

  const closePostDialog = useCallback(() => {
    setIsPostDialogOpen(false);
    setPendingBoardExport(null);
    setSubmitError('');
    revokePreviewUrl();
  }, []);

  const handleOpenPostDialog = useCallback(() => {
    if (isPostingToBoard) return;

    const exportResult = buildGifExport();
    if (!exportResult) {
      window.alert('Draw at least one frame before posting to the board.');
      return;
    }

    revokePreviewUrl();
    boardPreviewUrlRef.current = URL.createObjectURL(exportResult.blob);
    setPendingBoardExport({ ...exportResult, previewUrl: boardPreviewUrlRef.current });
    setSubmitError('');
    setIsPostDialogOpen(true);
  }, [isPostingToBoard, buildGifExport]);

  const handleSubmitBoardPost = useCallback(async ({
    postTitle,
    author,
    caption,
  }: { postTitle: string; author: string; caption: string }) => {
    if (!pendingBoardExport || isPostingToBoard) return;

    // Rate limiting
    const elapsed = Date.now() - lastPostTimeRef.current;
    if (lastPostTimeRef.current > 0 && elapsed < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
      setSubmitError(`Please wait ${remaining}s before posting again.`);
      return;
    }

    setIsPostingToBoard(true);
    setSubmitError('');

    try {
      const createdPost = await createBoardPost({
        gifBlob: pendingBoardExport.blob,
        title: postTitle,
        author,
        caption,
        width: pendingBoardExport.width,
        height: pendingBoardExport.height,
        fps: pendingBoardExport.fps,
        frameCount: pendingBoardExport.frameCount,
      });

      lastPostTimeRef.current = Date.now();
      closePostDialog();
      onPostCreated?.(createdPost);
      onNavigateToBoard?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Posting to the board failed. Please try again.';
      setSubmitError(message);
    } finally {
      setIsPostingToBoard(false);
    }
  }, [pendingBoardExport, isPostingToBoard, closePostDialog, onPostCreated, onNavigateToBoard]);

  // Cleanup preview URL on unmount
  useEffect(() => () => revokePreviewUrl(), []);

  return {
    isPostingToBoard,
    isPostDialogOpen,
    pendingBoardExport,
    submitError,
    handleOpenPostDialog,
    handleSubmitBoardPost,
    closePostDialog,
  };
};
