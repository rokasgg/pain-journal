-- AI usage caps (see CLAUDE.md "AI assistant").
--   * ai_usage: one row per user, UTC day and feature. Written ONLY by the
--     service role (chat-about-data via the RPCs below). Users can read their
--     own rows but never write them, the same model as `subscriptions`.
--   * consume_ai_message reserves one message atomically before the Claude
--     call, so parallel requests can't slip past the cap.
--   * The day is current_date in UTC: a client-supplied local date could be
--     gamed.
--
-- Run once in the Supabase SQL editor. Idempotent. Also listed in the
-- delete-account edge function's USER_TABLES.

create table if not exists ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  feature text not null default 'chat',
  messages int not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date, feature)
);

alter table ai_usage enable row level security;

drop policy if exists "Users read their own AI usage" on ai_usage;
create policy "Users read their own AI usage"
  on ai_usage for select
  using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role writes.

-- Returns the new message count for today, or null when a limit is reached.
create or replace function consume_ai_message(
  p_user uuid,
  p_feature text,
  p_max_messages int,
  p_max_tokens int
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into ai_usage as u (user_id, usage_date, feature, messages)
  values (p_user, (now() at time zone 'utc')::date, p_feature, 1)
  on conflict (user_id, usage_date, feature) do update
    set messages = u.messages + 1, updated_at = now()
    where u.messages < p_max_messages
      and u.input_tokens + u.output_tokens < p_max_tokens
  returning messages into v_count;
  return v_count;
end;
$$;

-- Adds the tokens a call used; p_refund gives the reserved message back
-- (the Claude call failed or its answer couldn't be used).
create or replace function record_ai_usage(
  p_user uuid,
  p_feature text,
  p_input int,
  p_output int,
  p_refund boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update ai_usage
    set input_tokens = input_tokens + greatest(p_input, 0),
        output_tokens = output_tokens + greatest(p_output, 0),
        messages = case when p_refund then greatest(messages - 1, 0) else messages end,
        updated_at = now()
    where user_id = p_user
      and usage_date = (now() at time zone 'utc')::date
      and feature = p_feature;
end;
$$;

revoke all on function consume_ai_message(uuid, text, int, int) from public, anon, authenticated;
revoke all on function record_ai_usage(uuid, text, int, int, boolean) from public, anon, authenticated;
grant execute on function consume_ai_message(uuid, text, int, int) to service_role;
grant execute on function record_ai_usage(uuid, text, int, int, boolean) to service_role;
