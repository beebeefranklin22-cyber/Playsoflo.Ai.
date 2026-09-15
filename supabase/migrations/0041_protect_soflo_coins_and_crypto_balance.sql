-- CRITICAL: profiles.soflo_coins (the in-app SoFloCoin currency, which
-- SendMoneyModal.jsx lets users transfer to each other) was never covered
-- by protect_balance_columns (0004_lock_down_money_tables.sql) even though
-- it's a balance column exactly like usd_balance/balance_usd -- any
-- authenticated user could mint unlimited SoFloCoin with a direct
-- User.update({ soflo_coins: 1e9 }) call. StakingManager.jsx and
-- RewardsProgram.jsx also credit it directly from the client during
-- staking/unstaking and reward payouts, which is the same class of bug
-- already fixed for usd_balance-style columns.
create or replace function public.protect_balance_columns() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if TG_OP = 'INSERT' then
      NEW.usd_balance := 0;
      NEW.balance_usd := 0;
      NEW.wallet_balance := 0;
      NEW.wallet_balance_usd := 0;
      NEW.provider_wallet_balance := 0;
      NEW.soflo_coins := 0;
    else
      NEW.usd_balance := OLD.usd_balance;
      NEW.balance_usd := OLD.balance_usd;
      NEW.wallet_balance := OLD.wallet_balance;
      NEW.wallet_balance_usd := OLD.wallet_balance_usd;
      NEW.provider_wallet_balance := OLD.provider_wallet_balance;
      NEW.soflo_coins := OLD.soflo_coins;
    end if;
  end if;
  return NEW;
end;
$$;

-- crypto_wallets.balance (StakingManager.jsx's non-SoFloCoin stake/unstake
-- path) has the identical problem: a plain client-writable numeric column
-- credited directly from the browser at "unstake" time based on
-- client-supplied stake/reward amounts. This isn't a real on-chain balance
-- (see cdp_wallets / api/_handlers/crypto-wallet.js for the actual
-- Base Sepolia testnet integration) -- it's a database-only number the app
-- displays and lets users transact against, so inflating it is still a
-- real integrity problem, not a victimless one.
create or replace function public.protect_crypto_wallet_balance() returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    if TG_OP = 'INSERT' then
      NEW.balance := 0;
    else
      NEW.balance := OLD.balance;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_crypto_wallet_balance_trg on public.crypto_wallets;
create trigger protect_crypto_wallet_balance_trg
before insert or update on public.crypto_wallets
for each row execute function public.protect_crypto_wallet_balance();
