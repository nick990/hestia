-- Conteggio membri famiglia per quota cashflow (RLS espone solo la propria riga).

create or replace function public.current_user_family_member_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.family_members
  where family_id = (
    select family_id
    from public.family_members
    where user_id = auth.uid()
    limit 1
  );
$$;

revoke all on function public.current_user_family_member_count() from public;
grant execute on function public.current_user_family_member_count() to authenticated;
