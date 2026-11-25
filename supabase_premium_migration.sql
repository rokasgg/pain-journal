-- Premium entitlement (Free vs Premium, see CLAUDE.md "Premium").
--   * subscriptions: one row per user, written ONLY by the service role
--     (revenuecat-webhook edge function, and the REST fallback in
--     supabase/functions/_shared/entitlement.ts). Users can read their own
--     row but never write it — that's why this isn't a column on profiles,
--     which the client upserts.
--   * Active = expires_at > now(). A cancelled subscription stays active
--     until it expires.
--
-- Run once in the Supabase SQL editor. Idempotent. Also listed in the
-- delete-account edge function's USER_TABLES.

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entitlement text not null default 'pain_journaling_pro',
  product_id text,
  period_type text check (period_type in ('trial', 'intro', 'normal')),
  expires_at timestamptz,
  will_renew boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

drop policy if exists "Users read their own subscription" on subscriptions;
create policy "Users read their own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role writes.
