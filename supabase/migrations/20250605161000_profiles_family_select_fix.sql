-- Fix: la policy profiles_select_family_members leggeva family_members, ma RLS
-- su family_members espone solo la riga dell'utente corrente → subquery incompleta.

create or replace function public.current_user_family_peer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select fm.user_id
  from public.family_members fm
  where fm.family_id = (
    select family_id
    from public.family_members
    where user_id = auth.uid()
    limit 1
  );
$$;

revoke all on function public.current_user_family_peer_ids() from public;
grant execute on function public.current_user_family_peer_ids() to authenticated;

drop policy if exists "profiles_select_family_members" on public.profiles;

create policy "profiles_select_family_members"
  on public.profiles
  for select
  to authenticated
  using (id in (select public.current_user_family_peer_ids()));
