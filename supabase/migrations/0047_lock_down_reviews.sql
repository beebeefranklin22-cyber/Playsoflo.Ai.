-- SubmitReviewModal.jsx / ReviewsList.jsx: reviews_write_authenticated was
-- "for all using(true) with check(true)" -- any signed-in user could
-- create, edit, or delete ANY review, or set status: "approved" /
-- verified_purchase: true directly through the API for a review that
-- isn't even theirs. Separately, ReviewsList.jsx only ever queries
-- status: "approved", and no file in this codebase ever sets a review to
-- "approved" -- with no moderation UI in existence, every real review
-- submitted through SubmitReviewModal.jsx (which always writes
-- status: "pending") vanished into a permanent black hole. Locking
-- writes to the real reviewer (plus admin) closes the
-- impersonation/tampering hole; since there is no moderation workflow to
-- hook an approval into, auto-approving genuine reviews on insert is
-- what actually fixes the black hole, rather than leaving real user
-- content invisible forever.
drop policy if exists "reviews_write_authenticated" on public.reviews;

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check (auth.email() = reviewer_email);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update to authenticated
  using (auth.email() = reviewer_email or public.is_admin(auth.email()))
  with check (auth.email() = reviewer_email or public.is_admin(auth.email()));

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews
  for delete to authenticated
  using (auth.email() = reviewer_email or public.is_admin(auth.email()));

-- Column-protection RLS can't express: status auto-approves on a
-- genuine insert (no moderation flow exists to gate it behind), can
-- still be moderated later by an admin, but is never client-settable to
-- whatever a reviewer wants. verified_purchase was always a client-set
-- literal (SubmitReviewModal.jsx hardcoded `true` for every review) --
-- there is no real purchase check wired in, so the badge is forced off
-- instead of shipping a fabricated claim.
create or replace function public.protect_review_moderation() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email()) then
    if TG_OP = 'INSERT' then
      NEW.status := 'approved';
      NEW.verified_purchase := false;
    else
      NEW.status := OLD.status;
      NEW.verified_purchase := OLD.verified_purchase;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_review_moderation_trg on public.reviews;
create trigger protect_review_moderation_trg
before insert or update on public.reviews
for each row execute function public.protect_review_moderation();

-- user_reviews_write_authenticated (property host reviews) was equally
-- wide open: PropertyReviewsList.jsx lets ANY authenticated user post or
-- overwrite the "host response" on any review on any listing --
-- host_response is meant to be the property owner's reply, not
-- something a stranger (or the reviewer themselves) can inject.
drop policy if exists "user_reviews_write_authenticated" on public.user_reviews;

drop policy if exists "user_reviews_insert_own" on public.user_reviews;
create policy "user_reviews_insert_own" on public.user_reviews
  for insert to authenticated
  with check (auth.email() = reviewer_email);

drop policy if exists "user_reviews_update_own" on public.user_reviews;
create policy "user_reviews_update_own" on public.user_reviews
  for update to authenticated
  using (
    auth.email() = reviewer_email
    or exists (select 1 from public.properties p where p.id = user_reviews.property_id and p.created_by = auth.email())
    or public.is_admin(auth.email())
  )
  with check (
    auth.email() = reviewer_email
    or exists (select 1 from public.properties p where p.id = user_reviews.property_id and p.created_by = auth.email())
    or public.is_admin(auth.email())
  );

drop policy if exists "user_reviews_delete_own" on public.user_reviews;
create policy "user_reviews_delete_own" on public.user_reviews
  for delete to authenticated
  using (auth.email() = reviewer_email or public.is_admin(auth.email()));

-- Column-protection RLS can't express: the review's own author may still
-- edit their rating/text, but only the property's real owner (the host)
-- may ever set host_response/host_response_date. verified_transaction
-- is forced off for the same reason verified_purchase is above -- no
-- real transaction check is wired in here either.
create or replace function public.protect_user_review_host_response() returns trigger
language plpgsql
as $$
declare
  v_is_host boolean;
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email()) then
    select exists (
      select 1 from public.properties p where p.id = NEW.property_id and p.created_by = auth.email()
    ) into v_is_host;

    if TG_OP = 'INSERT' then
      if not v_is_host then
        NEW.host_response := null;
        NEW.host_response_date := null;
      end if;
      NEW.verified_transaction := false;
    else
      if not v_is_host then
        NEW.host_response := OLD.host_response;
        NEW.host_response_date := OLD.host_response_date;
      end if;
      NEW.verified_transaction := OLD.verified_transaction;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_user_review_host_response_trg on public.user_reviews;
create trigger protect_user_review_host_response_trg
before insert or update on public.user_reviews
for each row execute function public.protect_user_review_host_response();

-- PropertyReviewModal.jsx creates a real UserReview, then tries to bump
-- properties.rating/reviews_count via asServiceRole (not a real
-- privilege bypass -- see 0046) -- properties_update_own only lets the
-- HOST update their own listing, so this always threw for the guest who
-- just left the review, surfacing "Failed to submit review" even though
-- the review itself had already saved (setting up a duplicate
-- resubmission). A narrow SECURITY DEFINER function (same shape as
-- increment_track_stream, 0015) lets any authenticated user trigger a
-- recompute of one specific property's own aggregate rating, without
-- granting general write access to that property.
create or replace function public.recompute_property_rating(p_property_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric;
  v_count integer;
begin
  select avg(rating), count(*) into v_avg, v_count
  from public.user_reviews
  where property_id = p_property_id;

  update public.properties
  set rating = round(coalesce(v_avg, 0)::numeric, 1),
      reviews_count = coalesce(v_count, 0)
  where id = p_property_id;
end;
$$;

revoke all on function public.recompute_property_rating(uuid) from public;
revoke all on function public.recompute_property_rating(uuid) from anon;
grant execute on function public.recompute_property_rating(uuid) to authenticated;

-- VideoCreationModal.jsx creates a real VideoPost, then tries to bump
-- challenges.total_videos via asServiceRole -- challenges_update_own
-- only lets the challenge's own CREATOR update it, so joining anyone
-- else's challenge (the normal case) always threw "Upload failed" even
-- though the video had already been posted, prompting duplicate
-- re-uploads.
create or replace function public.increment_challenge_video_count(p_challenge_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.challenges set total_videos = coalesce(total_videos, 0) + 1 where id = p_challenge_id;
end;
$$;

revoke all on function public.increment_challenge_video_count(uuid) from public;
revoke all on function public.increment_challenge_video_count(uuid) from anon;
grant execute on function public.increment_challenge_video_count(uuid) to authenticated;
