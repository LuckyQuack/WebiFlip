create extension if not exists pgcrypto;

create table if not exists public.gif_board_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  author text,
  gif_url text not null,
  poster_frame_url text,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  fps integer not null check (fps > 0),
  frame_count integer not null check (frame_count > 0),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists gif_board_posts_created_at_idx
  on public.gif_board_posts (created_at desc);

alter table public.gif_board_posts enable row level security;

drop policy if exists "Public can read gif board posts" on public.gif_board_posts;
create policy "Public can read gif board posts"
  on public.gif_board_posts
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Public can insert gif board posts" on public.gif_board_posts;
create policy "Public can insert gif board posts"
  on public.gif_board_posts
  for insert
  to anon, authenticated
  with check (
    status = 'published'
    and char_length(title) between 1 and 80
    and (author is null or char_length(author) <= 40)
    and (caption is null or char_length(caption) <= 240)
    and width between 1 and 550
    and height between 1 and 550
    and fps between 1 and 24
    and frame_count between 1 and 30
    and gif_url like '%/storage/v1/object/public/gif-board/posts/%'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gif-board',
  'gif-board',
  true,
  5242880,
  array['image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read gif board assets" on storage.objects;
drop policy if exists "Public can upload gif board assets" on storage.objects;
create policy "Public can upload gif board assets"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'gif-board'
    and name like 'posts/%'
  );
