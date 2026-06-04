-- Migrazione: allowed_emails → members + profiles

-- ---------------------------------------------------------------------------
-- members: utenti autorizzati (pre-provisionati prima del primo login)
-- ---------------------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  constraint members_email_unique unique (email)
);

create index members_email_lower_idx
  on public.members (lower(trim(email)));

alter table public.members enable row level security;

create policy "members_no_anon_access"
  on public.members
  for all
  to anon
  using (false)
  with check (false);

create policy "members_no_authenticated_access"
  on public.members
  for all
  to authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- profiles: dati app 1:1 con auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Migra dati da allowed_emails
-- ---------------------------------------------------------------------------
insert into public.members (email, created_at)
select lower(trim(email)), created_at
from public.allowed_emails
on conflict (email) do nothing;

-- Backfill utenti già registrati
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  )
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

update public.members m
set auth_user_id = u.id
from auth.users u
where lower(trim(m.email)) = lower(trim(u.email))
  and m.auth_user_id is null;

-- ---------------------------------------------------------------------------
-- Hook: solo email presenti in members possono registrarsi
-- ---------------------------------------------------------------------------
create or replace function public.hook_restrict_signup_by_member_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  is_member int;
begin
  user_email := lower(trim(event->'user'->>'email'));

  if user_email is null or user_email = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Email richiesta per la registrazione.',
        'http_code', 403
      )
    );
  end if;

  select count(*) into is_member
  from public.members
  where lower(trim(email)) = user_email;

  if is_member > 0 then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'message', 'Questo indirizzo email non è autorizzato ad accedere.',
      'http_code', 403
    )
  );
end;
$$;

grant execute
  on function public.hook_restrict_signup_by_member_email(jsonb)
  to supabase_auth_admin;

revoke execute
  on function public.hook_restrict_signup_by_member_email(jsonb)
  from authenticated, anon, public;

-- ---------------------------------------------------------------------------
-- Trigger: nuovo auth.users → profiles + collegamento members.auth_user_id
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  );

  update public.members
  set auth_user_id = new.id
  where lower(trim(email)) = lower(trim(new.email))
    and auth_user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

revoke execute
  on function public.handle_new_user()
  from authenticated, anon, public;

-- ---------------------------------------------------------------------------
-- Rimuovi modello legacy
-- ---------------------------------------------------------------------------
drop function if exists public.hook_restrict_signup_by_allowed_email(jsonb);

drop policy if exists "allowed_emails_no_anon_access" on public.allowed_emails;
drop policy if exists "allowed_emails_no_authenticated_access" on public.allowed_emails;

drop table if exists public.allowed_emails;
