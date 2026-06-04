-- Movimenti cashflow personali (entrata / uscita)

create table public.movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  amount numeric(12, 2) not null,
  occurred_on date not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movements_type_check check (type in ('income', 'expense')),
  constraint movements_amount_positive check (amount > 0),
  constraint movements_description_not_blank check (trim(description) <> '')
);

create index movements_user_occurred_idx
  on public.movements (user_id, occurred_on desc);

alter table public.movements enable row level security;

create policy "movements_select_own"
  on public.movements
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "movements_insert_own"
  on public.movements
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "movements_update_own"
  on public.movements
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "movements_delete_own"
  on public.movements
  for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.set_movements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger movements_set_updated_at
  before update on public.movements
  for each row
  execute function public.set_movements_updated_at();
