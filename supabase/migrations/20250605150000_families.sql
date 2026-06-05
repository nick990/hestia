-- Famiglie e scope movimenti personal/family

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint families_name_not_blank check (trim(name) <> '')
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  constraint family_members_user_unique unique (user_id)
);

create index family_members_family_id_idx on public.family_members (family_id);

alter table public.movements
  add column scope text not null default 'personal',
  add column family_id uuid references public.families (id) on delete restrict;

alter table public.movements
  add constraint movements_scope_check check (scope in ('personal', 'family'));

alter table public.movements
  add constraint movements_scope_family_consistency check (
    (scope = 'personal' and family_id is null)
    or (scope = 'family' and family_id is not null)
  );

update public.movements set scope = 'personal', family_id = null;

create index movements_family_occurred_idx
  on public.movements (family_id, occurred_on desc)
  where scope = 'family';

create or replace function public.current_user_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.family_members where user_id = auth.uid() limit 1;
$$;

revoke all on function public.current_user_family_id() from public;
grant execute on function public.current_user_family_id() to authenticated;

alter table public.families enable row level security;
alter table public.family_members enable row level security;

create policy "families_select_member"
  on public.families for select to authenticated
  using (
    id in (
      select family_id from public.family_members where user_id = auth.uid()
    )
  );

create policy "family_members_select_own"
  on public.family_members for select to authenticated
  using (user_id = auth.uid());

create policy "families_no_anon"
  on public.families for all to anon using (false) with check (false);

create policy "family_members_no_anon"
  on public.family_members for all to anon using (false) with check (false);

drop policy if exists "movements_select_own" on public.movements;
drop policy if exists "movements_insert_own" on public.movements;
drop policy if exists "movements_update_own" on public.movements;
drop policy if exists "movements_delete_own" on public.movements;

create policy "movements_select"
  on public.movements for select to authenticated
  using (
    (scope = 'personal' and user_id = auth.uid())
    or (scope = 'family' and family_id = public.current_user_family_id())
  );

create policy "movements_insert"
  on public.movements for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (scope = 'personal' and family_id is null)
      or (scope = 'family' and family_id = public.current_user_family_id())
    )
  );

create policy "movements_update"
  on public.movements for update to authenticated
  using (
    (scope = 'personal' and user_id = auth.uid())
    or (scope = 'family' and family_id = public.current_user_family_id())
  )
  with check (
    user_id = auth.uid()
    and (
      (scope = 'personal' and family_id is null)
      or (scope = 'family' and family_id = public.current_user_family_id())
    )
  );

create policy "movements_delete"
  on public.movements for delete to authenticated
  using (
    (scope = 'personal' and user_id = auth.uid())
    or (scope = 'family' and family_id = public.current_user_family_id())
  );
