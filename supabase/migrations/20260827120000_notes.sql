-- Note personali/famiglia e preferenze UI collasso (per utente)

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null default 'personal',
  family_id uuid references public.families (id) on delete restrict,
  title text not null default '',
  kind text not null default 'text',
  content jsonb not null default '{"body":""}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_scope_check check (scope in ('personal', 'family')),
  constraint notes_kind_check check (kind in ('text', 'checklist')),
  constraint notes_scope_family_consistency check (
    (scope = 'personal' and family_id is null)
    or (scope = 'family' and family_id is not null)
  )
);

create index notes_personal_updated_idx
  on public.notes (user_id, updated_at desc)
  where scope = 'personal';

create index notes_family_updated_idx
  on public.notes (family_id, updated_at desc)
  where scope = 'family';

create table public.note_ui_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  personal_section_collapsed boolean not null default false,
  family_section_collapsed boolean not null default false,
  collapsed_note_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

create or replace function public.notes_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'notes.user_id is immutable';
  end if;

  if new.scope is distinct from old.scope
     or new.family_id is distinct from old.family_id then
    if auth.uid() is distinct from old.user_id then
      raise exception 'only the creator can change note scope';
    end if;

    if new.scope = 'family'
       and new.family_id is distinct from public.current_user_family_id() then
      raise exception 'invalid family for shared note';
    end if;

    if new.scope = 'personal' then
      new.family_id := null;
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_before_update
  before update on public.notes
  for each row
  execute function public.notes_before_update();

create or replace function public.note_ui_prefs_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger note_ui_prefs_set_updated_at
  before update on public.note_ui_prefs
  for each row
  execute function public.note_ui_prefs_set_updated_at();

alter table public.notes enable row level security;
alter table public.note_ui_prefs enable row level security;

create policy "notes_select"
  on public.notes for select to authenticated
  using (
    (scope = 'personal' and user_id = auth.uid())
    or (scope = 'family' and family_id = public.current_user_family_id())
  );

create policy "notes_insert"
  on public.notes for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (scope = 'personal' and family_id is null)
      or (scope = 'family' and family_id = public.current_user_family_id())
    )
  );

create policy "notes_update"
  on public.notes for update to authenticated
  using (
    (scope = 'personal' and user_id = auth.uid())
    or (scope = 'family' and family_id = public.current_user_family_id())
  )
  with check (
    (scope = 'personal' and user_id = auth.uid() and family_id is null)
    or (scope = 'family' and family_id = public.current_user_family_id())
  );

create policy "notes_delete"
  on public.notes for delete to authenticated
  using (
    (scope = 'personal' and user_id = auth.uid())
    or (scope = 'family' and family_id = public.current_user_family_id())
  );

create policy "notes_no_anon"
  on public.notes for all to anon
  using (false)
  with check (false);

create policy "note_ui_prefs_select_own"
  on public.note_ui_prefs for select to authenticated
  using (user_id = auth.uid());

create policy "note_ui_prefs_insert_own"
  on public.note_ui_prefs for insert to authenticated
  with check (user_id = auth.uid());

create policy "note_ui_prefs_update_own"
  on public.note_ui_prefs for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "note_ui_prefs_delete_own"
  on public.note_ui_prefs for delete to authenticated
  using (user_id = auth.uid());

create policy "note_ui_prefs_no_anon"
  on public.note_ui_prefs for all to anon
  using (false)
  with check (false);

grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.note_ui_prefs to authenticated;
