-- Columns for the analytics/rewards functions in src/functions/*.js that
-- 0001 couldn't see yet. 0001 already inferred earned_rewards/
-- last_reward_calculation on stakings as text, which is the wrong type
-- for a reward accrual computation — added correctly-typed columns
-- instead of trying to alter the type of a column that might already
-- hold data.
alter table public.stakings add column if not exists accumulated_rewards numeric not null default 0;
alter table public.stakings add column if not exists last_reward_calculated_at timestamptz;
