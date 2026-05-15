import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const BOARD_POSTS_TABLE = import.meta.env.VITE_SUPABASE_BOARD_TABLE || 'gif_board_posts';
export const BOARD_GIFS_BUCKET = import.meta.env.VITE_SUPABASE_BOARD_BUCKET || 'gif-board';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
