-- Ruoli admin/user, soft delete (disabled_at), hook signup aggiornato, RLS per middleware

-- ---------------------------------------------------------------------------
-- Ruoli: rinomina legacy 'member' → 'user'
-- ---------------------------------------------------------------------------
update public.members
set role = 'user'
where role = 'member';

alter table public.members
  alter column role set default 'user';

alter table public.members
  add constraint members_role_check check (role in ('admin', 'user'));

-- ---------------------------------------------------------------------------
-- Soft delete
-- ---------------------------------------------------------------------------
alter table public.members
  add column disabled_at timestamptz null;

-- ---------------------------------------------------------------------------
-- RLS: ogni utente loggato legge la propria riga (middleware + helper auth)
-- ---------------------------------------------------------------------------
create policy "members_select_own"
  on public.members
  for select
  to authenticated
  using (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Hook: signup solo se email in members e non disabilitata
-- ---------------------------------------------------------------------------
create or replace function public.hook_restrict_signup_by_member_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  member_row public.members%rowtype;
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

  select * into member_row
  from public.members
  where lower(trim(email)) = user_email;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Questo indirizzo email non è autorizzato ad accedere.',
        'http_code', 403
      )
    );
  end if;

  if member_row.disabled_at is not null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Questo account è stato disabilitato.',
        'http_code', 403
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute
  on function public.hook_restrict_signup_by_member_email(jsonb)
  to supabase_auth_admin;

revoke execute
  on function public.hook_restrict_signup_by_member_email(jsonb)
  from authenticated, anon, public;
