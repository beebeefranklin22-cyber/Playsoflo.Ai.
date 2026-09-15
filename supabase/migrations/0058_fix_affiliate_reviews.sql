-- affiliate_reviews only had id/timestamps/helpful_count/listing_id, but
-- AffiliateReviewsModal.jsx (reachable via CommunityAffiliate.jsx, routed
-- through /CommunityAffiliate) has always written reviewer_email/
-- reviewer_name/reviewer_photo/rating/review_text/images to it -- every
-- "Submit Review" click has always failed at the database level.
alter table public.affiliate_reviews
  add column if not exists reviewer_email text,
  add column if not exists reviewer_name text,
  add column if not exists reviewer_photo text,
  add column if not exists rating numeric,
  add column if not exists review_text text,
  add column if not exists images jsonb default '[]'::jsonb;

drop policy if exists "affiliate_reviews_select_authenticated" on public.affiliate_reviews;
drop policy if exists "affiliate_reviews_write_authenticated" on public.affiliate_reviews;

-- Reviews are public read (anyone browsing a listing sees them) but only
-- the review's own author can write its content; "mark helpful" needs to
-- stay open to any authenticated user, so the row stays update-permissive
-- and a trigger pins the substantive fields to OLD unless the real author
-- (or an admin) is writing -- same pattern used for streaming_contents.
create policy "affiliate_reviews_select_all" on public.affiliate_reviews
  for select to authenticated using (true);

create policy "affiliate_reviews_insert_own" on public.affiliate_reviews
  for insert to authenticated
  with check (auth.email() = reviewer_email);

create policy "affiliate_reviews_update_any" on public.affiliate_reviews
  for update to authenticated using (true) with check (true);

create policy "affiliate_reviews_delete_own" on public.affiliate_reviews
  for delete to authenticated
  using (auth.email() = reviewer_email or public.is_admin(auth.email()));

create or replace function public.protect_affiliate_review_content() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' and not public.is_admin(auth.email())
     and auth.email() is distinct from OLD.reviewer_email then
    NEW.reviewer_email := OLD.reviewer_email;
    NEW.reviewer_name := OLD.reviewer_name;
    NEW.reviewer_photo := OLD.reviewer_photo;
    NEW.rating := OLD.rating;
    NEW.review_text := OLD.review_text;
    NEW.images := OLD.images;
    NEW.listing_id := OLD.listing_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_affiliate_review_content_trg on public.affiliate_reviews;
create trigger protect_affiliate_review_content_trg
before update on public.affiliate_reviews
for each row execute function public.protect_affiliate_review_content();

create index if not exists idx_affiliate_reviews_listing_id on public.affiliate_reviews(listing_id);
