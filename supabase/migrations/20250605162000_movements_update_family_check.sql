-- Fix: WITH CHECK su movements_update richiedeva user_id = auth.uid() anche per
-- movimenti family, bloccando la modifica da altri membri della famiglia.

drop policy if exists "movements_update" on public.movements;

create policy "movements_update"
  on public.movements for update to authenticated
  using (
    (scope = 'personal' and user_id = auth.uid())
    or (scope = 'family' and family_id = public.current_user_family_id())
  )
  with check (
    (scope = 'personal' and user_id = auth.uid() and family_id is null)
    or (scope = 'family' and family_id = public.current_user_family_id())
  );
