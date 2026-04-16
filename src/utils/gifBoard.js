import { BOARD_GIFS_BUCKET, BOARD_POSTS_TABLE, isSupabaseConfigured, supabase } from './supabase';

const GIF_BOARD_SETUP_PATH = 'supabase/setup-gif-board.sql';

const requireSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.');
  }
};

const sanitizeSegment = (value, fallback) => {
  const trimmed = (value || '').trim().toLowerCase();
  const safeValue = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return safeValue || fallback;
};

const normalizePost = (row) => ({
  id: String(row.id),
  title: row.title || 'Untitled flip',
  caption: row.caption || '',
  author: row.author || '',
  gifUrl: row.gif_url || row.gifUrl || '',
  posterFrameUrl: row.poster_frame_url || row.posterFrameUrl || '',
  width: Number(row.width || 0),
  height: Number(row.height || 0),
  fps: Number(row.fps || 0),
  frameCount: Number(row.frame_count || row.frameCount || 0),
  createdAt: row.created_at || row.createdAt || '',
});

const withSetupHint = (error, fallbackMessage) => {
  const rawMessage = error?.message || fallbackMessage;
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    normalizedMessage.includes('schema cache') ||
    normalizedMessage.includes('could not find the table') ||
    normalizedMessage.includes('relation') && normalizedMessage.includes('does not exist')
  ) {
    return `Could not load board posts because the "${BOARD_POSTS_TABLE}" table does not exist yet. Run the SQL in "${GIF_BOARD_SETUP_PATH}" inside the Supabase SQL editor, then refresh.`;
  }

  if (normalizedMessage.includes('bucket not found')) {
    return `Could not upload the GIF because the "${BOARD_GIFS_BUCKET}" storage bucket does not exist yet. Run the SQL in "${GIF_BOARD_SETUP_PATH}" inside the Supabase SQL editor, then try again.`;
  }

  return fallbackMessage;
};

export const listBoardPosts = async ({ limit = 120 } = {}) => {
  requireSupabase();

  const { data, error } = await supabase
    .from(BOARD_POSTS_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(withSetupHint(error, `Could not load board posts from "${BOARD_POSTS_TABLE}". ${error.message}`));
  }

  return (data || []).map(normalizePost);
};

export const createBoardPost = async ({
  gifBlob,
  title,
  author,
  caption,
  width,
  height,
  fps,
  frameCount,
}) => {
  requireSupabase();

  const trimmedTitle = (title || '').trim();
  if (!trimmedTitle) {
    throw new Error('A title is required before posting to the board.');
  }

  const timestamp = new Date().toISOString();
  const titleSegment = sanitizeSegment(trimmedTitle, 'untitled-flip');
  const objectPath = `posts/${timestamp.replace(/[:.]/g, '-')}-${titleSegment}.gif`;

  const { error: uploadError } = await supabase.storage
    .from(BOARD_GIFS_BUCKET)
    .upload(objectPath, gifBlob, {
      cacheControl: '31536000',
      contentType: 'image/gif',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(withSetupHint(uploadError, `Could not upload the GIF to the "${BOARD_GIFS_BUCKET}" bucket. ${uploadError.message}`));
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BOARD_GIFS_BUCKET).getPublicUrl(objectPath);

  const payload = {
    title: trimmedTitle,
    author: (author || '').trim() || null,
    caption: (caption || '').trim() || null,
    gif_url: publicUrl,
    created_at: timestamp,
    width,
    height,
    fps,
    frame_count: frameCount,
  };

  const { data, error } = await supabase
    .from(BOARD_POSTS_TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(withSetupHint(error, `Could not save the board post in "${BOARD_POSTS_TABLE}". ${error.message}`));
  }

  return normalizePost(data);
};
