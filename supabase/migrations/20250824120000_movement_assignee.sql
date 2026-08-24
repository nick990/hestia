-- Assegnatario movimenti: created_by + assignee_kind/member + is_private (drop scope/family_id)

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
alter table public.movements rename column user_id to created_by;

alter table public.movements
  add column assignee_kind text,
  add column assignee_user_id uuid references auth.users (id) on delete restrict,
  add column is_private boolean not null default false;

update public.movements
set
  assignee_kind = 'family',
  assignee_user_id = null,
  is_private = false
where scope = 'family';

update public.movements
set
  assignee_kind = 'member',
  assignee_user_id = created_by,
  is_private = true
where scope = 'private';

alter table public.movements alter column assignee_kind set not null;

-- Drop policies before dropping scope/family_id columns
drop policy if exists "movements_select" on public.movements;
drop policy if exists "movements_insert" on public.movements;
drop policy if exists "movements_update" on public.movements;
drop policy if exists "movements_delete" on public.movements;

alter table public.movements drop constraint if exists movements_scope_check;
alter table public.movements drop constraint if exists movements_scope_family_consistency;

alter table public.movements drop column scope;
alter table public.movements drop column family_id;

alter table public.movements
  add constraint movements_assignee_kind_check
  check (assignee_kind in ('family', 'member'));

alter table public.movements
  add constraint movements_assignee_consistency check (
    (
      assignee_kind = 'family'
      and assignee_user_id is null
      and is_private = false
    )
    or (
      assignee_kind = 'member'
      and assignee_user_id is not null
    )
  );

alter table public.movements
  add constraint movements_private_member check (
    is_private = false
    or assignee_kind = 'member'
  );

drop index if exists movements_user_occurred_idx;
drop index if exists movements_family_occurred_idx;

create index movements_created_by_occurred_idx
  on public.movements (created_by, occurred_on desc);

create index movements_assignee_family_occurred_idx
  on public.movements (occurred_on desc)
  where assignee_kind = 'family';

create index movements_assignee_member_occurred_idx
  on public.movements (assignee_user_id, occurred_on desc)
  where assignee_kind = 'member';

-- ---------------------------------------------------------------------------
-- Helper: same family membership
-- ---------------------------------------------------------------------------
create or replace function public.users_share_family(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm1
    join public.family_members fm2 on fm1.family_id = fm2.family_id
    where fm1.user_id = a
      and fm2.user_id = b
  );
$$;

revoke all on function public.users_share_family(uuid, uuid) from public;
grant execute on function public.users_share_family(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS (policies dropped above before column drop)
-- ---------------------------------------------------------------------------
create policy "movements_select"
  on public.movements
  for select
  to authenticated
  using (
    (
      assignee_kind = 'family'
      and public.users_share_family(auth.uid(), created_by)
    )
    or (
      assignee_kind = 'member'
      and is_private = false
      and (
        public.users_share_family(auth.uid(), assignee_user_id)
        or (
          public.current_user_family_id() is null
          and assignee_user_id = auth.uid()
        )
      )
    )
    or (
      assignee_kind = 'member'
      and is_private = true
      and assignee_user_id = auth.uid()
    )
  );

create policy "movements_insert"
  on public.movements
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      (
        assignee_kind = 'family'
        and public.current_user_family_id() is not null
      )
      or (
        assignee_kind = 'member'
        and assignee_user_id is not null
        and (
          public.users_share_family(auth.uid(), assignee_user_id)
          or (
            public.current_user_family_id() is null
            and assignee_user_id = auth.uid()
          )
        )
      )
    )
    and (
      is_private = false
      or assignee_user_id = auth.uid()
    )
  );

create policy "movements_update"
  on public.movements
  for update
  to authenticated
  using (
    (
      assignee_kind = 'family'
      and public.users_share_family(auth.uid(), created_by)
    )
    or (
      assignee_kind = 'member'
      and is_private = false
      and (
        public.users_share_family(auth.uid(), assignee_user_id)
        or (
          public.current_user_family_id() is null
          and assignee_user_id = auth.uid()
        )
      )
    )
    or (
      assignee_kind = 'member'
      and is_private = true
      and assignee_user_id = auth.uid()
    )
    or (
      assignee_kind = 'member'
      and public.current_user_family_id() is null
      and assignee_user_id = auth.uid()
    )
  )
  with check (
    (
      (
        assignee_kind = 'family'
        and assignee_user_id is null
        and is_private = false
        and public.current_user_family_id() is not null
      )
      or (
        assignee_kind = 'member'
        and assignee_user_id is not null
        and (
          public.users_share_family(auth.uid(), assignee_user_id)
          or (
            public.current_user_family_id() is null
            and assignee_user_id = auth.uid()
          )
        )
      )
    )
    and (
      is_private = false
      or assignee_user_id = auth.uid()
    )
  );

create policy "movements_delete"
  on public.movements
  for delete
  to authenticated
  using (
    (
      assignee_kind = 'family'
      and public.users_share_family(auth.uid(), created_by)
    )
    or (
      assignee_kind = 'member'
      and is_private = false
      and (
        public.users_share_family(auth.uid(), assignee_user_id)
        or (
          public.current_user_family_id() is null
          and assignee_user_id = auth.uid()
        )
      )
    )
    or (
      assignee_kind = 'member'
      and is_private = true
      and assignee_user_id = auth.uid()
    )
    or (
      assignee_kind = 'member'
      and public.current_user_family_id() is null
      and assignee_user_id = auth.uid()
    )
  );

create or replace function public.movements_preserve_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by is immutable';
  end if;
  return new;
end;
$$;

create trigger movements_preserve_created_by
  before update on public.movements
  for each row
  execute function public.movements_preserve_created_by();
