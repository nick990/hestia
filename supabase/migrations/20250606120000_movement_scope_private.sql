-- Rinomina scope personal → private e aggiorna RLS.

ALTER TABLE public.movements DROP CONSTRAINT movements_scope_check;
ALTER TABLE public.movements DROP CONSTRAINT movements_scope_family_consistency;

UPDATE public.movements SET scope = 'private' WHERE scope = 'personal';

ALTER TABLE public.movements ADD CONSTRAINT movements_scope_check
  CHECK (scope IN ('private', 'family'));

ALTER TABLE public.movements ADD CONSTRAINT movements_scope_family_consistency
  CHECK (
    (scope = 'private' AND family_id IS NULL)
    OR (scope = 'family' AND family_id IS NOT NULL)
  );

ALTER TABLE public.movements ALTER COLUMN scope SET DEFAULT 'private';

DROP POLICY IF EXISTS "movements_select" ON public.movements;
DROP POLICY IF EXISTS "movements_insert" ON public.movements;
DROP POLICY IF EXISTS "movements_update" ON public.movements;
DROP POLICY IF EXISTS "movements_delete" ON public.movements;

CREATE POLICY "movements_select"
  ON public.movements FOR SELECT TO authenticated
  USING (
    (scope = 'private' AND user_id = auth.uid())
    OR (scope = 'family' AND family_id = public.current_user_family_id())
  );

CREATE POLICY "movements_insert"
  ON public.movements FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (scope = 'private' AND family_id IS NULL)
      OR (scope = 'family' AND family_id = public.current_user_family_id())
    )
  );

CREATE POLICY "movements_update"
  ON public.movements FOR UPDATE TO authenticated
  USING (
    (scope = 'private' AND user_id = auth.uid())
    OR (scope = 'family' AND family_id = public.current_user_family_id())
  )
  WITH CHECK (
    (scope = 'private' AND user_id = auth.uid() AND family_id IS NULL)
    OR (scope = 'family' AND family_id = public.current_user_family_id())
  );

CREATE POLICY "movements_delete"
  ON public.movements FOR DELETE TO authenticated
  USING (
    (scope = 'private' AND user_id = auth.uid())
    OR (scope = 'family' AND family_id = public.current_user_family_id())
  );
