-- ad_campaigns_update_own (0001_baseline_schema.sql) lets an advertiser
-- update their own campaign row, including `status` -- needed so
-- AdsManager.jsx's pause/resume toggle works without a server round trip.
-- But combined with the old client-side "confirm payment" flow (trusting a
-- ?payment=success URL param and flipping status to 'active' itself), this
-- meant any signed-in user could activate any of their own pending
-- campaigns for free, with no payment ever actually happening. Real
-- activation now happens only in api/_handlers/ad-campaign.js after
-- independently verifying a Stripe Checkout Session paid -- this pins
-- `status` so nothing else can move a campaign into or out of
-- pending_payment, while still allowing the legitimate self-service
-- active<->paused toggle.
create or replace function public.protect_ad_campaign_status() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if TG_OP = 'INSERT' then
      -- Every new campaign starts unpaid, regardless of what the client
      -- sends -- ad-campaign.js's create action already inserts with this
      -- status, this just makes it impossible to insert any other way.
      NEW.status := 'pending_payment';
    elsif OLD.status is distinct from NEW.status then
      if not (OLD.status in ('active', 'paused') and NEW.status in ('active', 'paused')) then
        NEW.status := OLD.status;
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_ad_campaign_status_trg on public.ad_campaigns;
create trigger protect_ad_campaign_status_trg
before insert or update on public.ad_campaigns
for each row execute function public.protect_ad_campaign_status();
