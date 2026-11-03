-- Opt-in account-private ResearchLens sync. Apply AFTER supabase/schema.sql.
-- Never expose the service_role key or give unrestricted anonymous access.
create table if not exists public.research_user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  namespace text not null default 'research_workspace'
    check (namespace in ('research_workspace')),
  payload jsonb not null default '{}'::jsonb
    check (octet_length(payload::text) <= 1000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, namespace)
);
alter table public.research_user_data enable row level security;
revoke all on public.research_user_data from anon;
grant select, insert, update, delete on public.research_user_data to authenticated;

drop policy if exists "research_user_data_select_own" on public.research_user_data;
create policy "research_user_data_select_own" on public.research_user_data
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "research_user_data_insert_own" on public.research_user_data;
create policy "research_user_data_insert_own" on public.research_user_data
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "research_user_data_update_own" on public.research_user_data;
create policy "research_user_data_update_own" on public.research_user_data
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "research_user_data_delete_own" on public.research_user_data;
create policy "research_user_data_delete_own" on public.research_user_data
  for delete to authenticated using (auth.uid() = user_id);

-- The client never queries data belonging to another researcher.
