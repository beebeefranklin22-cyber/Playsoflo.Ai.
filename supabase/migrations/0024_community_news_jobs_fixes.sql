-- Community / News / Jobs hubs audit fixes.
--
-- Root cause (shared with the other hub-fixes migrations in this series):
-- Entity.create()/.update() in src/api/entities.js does no field filtering,
-- so a payload field that isn't a real column fails the WHOLE insert/update
-- silently. All three hubs below had their primary "create" form sending
-- fields the underlying table never had, so creation was completely broken.

-- -----------------------------------------------------------------------------
-- forum_groups: ForumGroups.jsx's create form (name, description, category,
-- icon, banner_image, rules, is_private, require_approval) was rejected
-- outright — the table had only creator/membership bookkeeping columns, none
-- of the actual group content fields. Add them.
-- -----------------------------------------------------------------------------
alter table public.forum_groups add column if not exists name text;
alter table public.forum_groups add column if not exists description text;
alter table public.forum_groups add column if not exists category text default 'other';
alter table public.forum_groups add column if not exists icon text;
alter table public.forum_groups add column if not exists banner_image text;
alter table public.forum_groups add column if not exists is_private boolean default false;
alter table public.forum_groups add column if not exists require_approval boolean default false;

-- The create call never set is_active, and ForumGroups.jsx lists groups with
-- .filter({ is_active: true }) — so every newly created group was invisible
-- on its own listing page even once the insert itself started succeeding.
alter table public.forum_groups alter column is_active set default true;
update public.forum_groups set is_active = true where is_active is null;

-- -----------------------------------------------------------------------------
-- forum_threads: CommunityForums.jsx's create form (title, content, category,
-- images, video_url) was rejected outright — none of those columns existed.
-- Add them, plus the pin/lock/view-count columns the thread detail view
-- already reads (thread.is_pinned, thread.is_locked, thread.views).
-- -----------------------------------------------------------------------------
alter table public.forum_threads add column if not exists title text;
alter table public.forum_threads add column if not exists content text;
alter table public.forum_threads add column if not exists category text default 'general';
alter table public.forum_threads add column if not exists images jsonb default '[]'::jsonb;
alter table public.forum_threads add column if not exists video_url text;
alter table public.forum_threads add column if not exists is_pinned boolean default false;
alter table public.forum_threads add column if not exists is_locked boolean default false;
alter table public.forum_threads add column if not exists views integer default 0;

-- -----------------------------------------------------------------------------
-- news_posts: both CommunityNews.jsx and NewsCreatorDashboard.jsx create a
-- post with title/content/category/featured_image/video_url/source_url (plus
-- images/documents on the community-facing form), but the table only ever
-- had live-broadcast bookkeeping columns (agora_channel_name, is_live,
-- likes, live_*). Every "Post News" submission failed silently. Comments
-- and likes were already wired correctly against `comments`/`news_posts`
-- (post_id/post_type/likes columns already existed) — they just had no real
-- post to attach to.
-- -----------------------------------------------------------------------------
alter table public.news_posts add column if not exists title text;
alter table public.news_posts add column if not exists content text;
alter table public.news_posts add column if not exists category text default 'other';
alter table public.news_posts add column if not exists featured_image text;
alter table public.news_posts add column if not exists images jsonb default '[]'::jsonb;
alter table public.news_posts add column if not exists documents jsonb default '[]'::jsonb;
alter table public.news_posts add column if not exists video_url text;
alter table public.news_posts add column if not exists source_url text;
alter table public.news_posts add column if not exists views integer default 0;

-- CommunityNews.jsx's create form never set `status`, but the feed only
-- shows posts where status = 'published' — so a post made from that modal
-- would insert (once the columns above exist) yet never appear anywhere.
-- Default new posts to published; NewsCreatorDashboard.jsx already sends an
-- explicit status and is unaffected.
alter table public.news_posts alter column status set default 'published';
update public.news_posts set status = 'published' where status is null;

-- -----------------------------------------------------------------------------
-- job_gigs: CommunityJobs.jsx's create form (title, description, type,
-- category, company_name, location, remote_ok, pay_rate, pay_type,
-- contact_email, contact_phone, application_url, images) was rejected
-- outright — the table had only poster/requirements/benefits bookkeeping.
-- pay_rate is a free-text field in the form ("$20/hr", "Competitive", a
-- range, etc.), so it must be text, not numeric.
-- -----------------------------------------------------------------------------
alter table public.job_gigs add column if not exists title text;
alter table public.job_gigs add column if not exists description text;
alter table public.job_gigs add column if not exists type text default 'gig';
alter table public.job_gigs add column if not exists category text default 'other';
alter table public.job_gigs add column if not exists company_name text;
alter table public.job_gigs add column if not exists location text;
alter table public.job_gigs add column if not exists remote_ok boolean default false;
alter table public.job_gigs add column if not exists pay_rate text;
alter table public.job_gigs add column if not exists pay_type text default 'negotiable';
alter table public.job_gigs add column if not exists contact_email text;
alter table public.job_gigs add column if not exists contact_phone text;
alter table public.job_gigs add column if not exists application_url text;
alter table public.job_gigs add column if not exists images jsonb default '[]'::jsonb;

-- CommunityJobs.jsx's create form never set `status`, but the listing only
-- shows jobs where status = 'active' — same invisible-after-insert bug as
-- forum_groups.is_active and news_posts.status above.
alter table public.job_gigs alter column status set default 'active';
update public.job_gigs set status = 'active' where status is null;

-- job_applications/saved_jobs.pay_rate were declared numeric, but the value
-- that actually flows in is job_gigs.pay_rate — the free-text field above.
-- A non-numeric entry (the common case: "$20/hr", "Negotiable") would fail
-- the insert with a type error. Widen both to text to match reality.
alter table public.job_applications alter column pay_rate type text using pay_rate::text;
alter table public.saved_jobs alter column pay_rate type text using pay_rate::text;

-- -----------------------------------------------------------------------------
-- job_applications: ApplicationTracker.jsx's status-update form sends `notes`
-- and `next_step`, neither of which existed as columns, so every "Update
-- Application" save failed silently.
-- -----------------------------------------------------------------------------
alter table public.job_applications add column if not exists notes text;
alter table public.job_applications add column if not exists next_step text;

-- job_applications_select_authenticated was `using (true)` — any signed-in
-- user could read every applicant's application to every job, not just
-- their own. There is no employer-facing "view applicants" page yet, but
-- scope the read policy now so one can be built without a further RLS
-- change: an employer may see applications for jobs they posted (via
-- job_gigs.poster_email), and an applicant may always see their own.
drop policy if exists "job_applications_select_authenticated" on public.job_applications;
drop policy if exists "job_applications_select_involved" on public.job_applications;
create policy "job_applications_select_involved" on public.job_applications
  for select to authenticated
  using (
    auth.email() = user_email
    or exists (
      select 1 from public.job_gigs jg
      where jg.id = job_applications.job_id
        and jg.poster_email = auth.email()
    )
  );
