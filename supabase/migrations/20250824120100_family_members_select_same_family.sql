-- Consenti ai membri di leggere gli altri membri della propria famiglia (filtri/assegnatario)

create policy "family_members_select_same_family"
  on public.family_members
  for select
  to authenticated
  using (family_id = public.current_user_family_id());
