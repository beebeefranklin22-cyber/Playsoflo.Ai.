-- Music Hub fixes: uploading, browsing, likes/comments, play counts, and
-- buying a track actually crediting the artist's wallet.
--
-- music_tracks was missing every field the upload form
-- (MusicStudio.jsx's trackForm) and every consumer (MusicPlayer, browse
-- pages) actually read/write -- title, genre, pricing, audio/cover URLs,
-- etc. -- so uploads silently failed (PostgREST rejects an insert
-- containing unknown columns) and, even if a row existed, playback/browse
-- UI had nothing real to read.
alter table public.music_tracks add column if not exists title text;
alter table public.music_tracks add column if not exists description text;
alter table public.music_tracks add column if not exists album text;
alter table public.music_tracks add column if not exists genre text;
alter table public.music_tracks add column if not exists pricing_model text default 'free';
alter table public.music_tracks add column if not exists price_usd numeric default 0;
alter table public.music_tracks add column if not exists price_soflo numeric default 0;
alter table public.music_tracks add column if not exists audio_file_url text;
alter table public.music_tracks add column if not exists preview_url text;
alter table public.music_tracks add column if not exists cover_art_url text;
alter table public.music_tracks add column if not exists explicit boolean default false;
alter table public.music_tracks add column if not exists allow_downloads boolean default false;
alter table public.music_tracks add column if not exists download_count integer default 0;
alter table public.music_tracks add column if not exists revenue_generated numeric default 0;

-- content_purchases needs both column families it was already given
-- defensively (see api/_lib/orderHelpers.js) actually populated together;
-- no schema change needed here, just noting why the checkout code writes
-- both item_id/item_type and content_id/purchase_type.

-- ── track_likes / track_comments: MusicPlayer's like/comment UI was 100%
-- local useState with nothing persisted (any reload lost it, and nobody
-- else ever saw a like or comment). These are new tables so the feature
-- can actually work.
create table if not exists public.track_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  track_id uuid not null,
  user_email text not null,
  unique (track_id, user_email)
);

alter table public.track_likes enable row level security;
drop policy if exists "track_likes_select_all" on public.track_likes;
create policy "track_likes_select_all" on public.track_likes for select to authenticated using (true);
drop policy if exists "track_likes_insert_own" on public.track_likes;
create policy "track_likes_insert_own" on public.track_likes for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "track_likes_delete_own" on public.track_likes;
create policy "track_likes_delete_own" on public.track_likes for delete to authenticated using (auth.email() = user_email);
grant select, insert, delete on public.track_likes to authenticated;

create table if not exists public.track_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  track_id uuid not null,
  user_email text not null,
  user_name text,
  comment_text text not null,
  is_anonymous boolean not null default false
);

alter table public.track_comments enable row level security;
drop policy if exists "track_comments_select_all" on public.track_comments;
create policy "track_comments_select_all" on public.track_comments for select to authenticated using (true);
drop policy if exists "track_comments_insert_own" on public.track_comments;
create policy "track_comments_insert_own" on public.track_comments for insert to authenticated with check (auth.email() = user_email);
drop policy if exists "track_comments_delete_own" on public.track_comments;
create policy "track_comments_delete_own" on public.track_comments for delete to authenticated using (auth.email() = user_email);
grant select, insert, delete on public.track_comments to authenticated;

-- ── increment_track_stream: music_tracks_update_own only lets the artist
-- update their own track row, so a listener's client-side
-- MusicTrack.update(id, {stream_count: n+1}) (MusicPlayer.jsx,
-- ArtistProfile.jsx) has always silently failed under RLS for every
-- listener except the artist playing their own track. A narrow
-- SECURITY DEFINER function lets any authenticated listener bump the
-- counter without granting general update access to strangers' rows.
create or replace function public.increment_track_stream(p_track_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.music_tracks set stream_count = coalesce(stream_count, 0) + 1 where id = p_track_id;
end;
$$;

revoke all on function public.increment_track_stream(uuid) from public;
revoke all on function public.increment_track_stream(uuid) from anon;
grant execute on function public.increment_track_stream(uuid) to authenticated;
