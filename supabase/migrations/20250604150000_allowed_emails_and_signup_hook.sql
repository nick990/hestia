-- Allowlist email per registrazione (Google OAuth via Supabase Auth)

create table if not exists public.allowed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint allowed_emails_email_unique unique (email)
);

create index if not exists allowed_emails_email_lower_idx
  on public.allowed_emails (lower(trim(email)));

alter table public.allowed_emails enable row level security;

-- Nessun accesso via API client: solo la funzione hook (security definer)
create policy "allowed_emails_no_anon_access"
  on public.allowed_emails
  for all
  to anon
  using (false)
  with check (false);

create policy "allowed_emails_no_authenticated_access"
  on public.allowed_emails
  for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.hook_restrict_signup_by_allowed_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  is_allowed int;
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

  select count(*) into is_allowed
  from public.allowed_emails
  where lower(trim(email)) = user_email;

  if is_allowed > 0 then
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
  on function public.hook_restrict_signup_by_allowed_email(jsonb)
  to supabase_auth_admin;

revoke execute
  on function public.hook_restrict_signup_by_allowed_email(jsonb)
  from authenticated, anon, public;

-- Sostituire con le email reali autorizzate
insert into public.allowed_emails (email)
values ('your.email@example.com')
on conflict do nothing;
