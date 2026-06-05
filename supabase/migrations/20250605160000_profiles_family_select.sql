-- Consenti ai membri di una famiglia di leggere nome/email degli altri membri
-- (es. colonna «Inserito da» nel cashflow condiviso)

create policy "profiles_select_family_members"
  on public.profiles
  for select
  to authenticated
  using (
    public.current_user_family_id() is not null
    and id in (
      select fm.user_id
      from public.family_members fm
      where fm.family_id = public.current_user_family_id()
    )
  );
