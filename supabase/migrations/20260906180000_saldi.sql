-- Ripartizione uscite e rimborsi (Saldi)

create table public.movement_payments (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null unique references public.movements (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  payer_user_id uuid not null references auth.users (id) on delete restrict,
  split_mode text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movement_payments_split_mode_check check (split_mode in ('equal', 'amount'))
);

create table public.movement_payment_shares (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.movement_payments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  amount numeric(12, 2) not null,
  constraint movement_payment_shares_amount_positive check (amount > 0),
  constraint movement_payment_shares_unique unique (payment_id, user_id)
);

create table public.reimbursements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  from_user_id uuid not null references auth.users (id) on delete restrict,
  to_user_id uuid not null references auth.users (id) on delete restrict,
  amount numeric(12, 2) not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint reimbursements_amount_positive check (amount > 0),
  constraint reimbursements_from_to_distinct check (from_user_id <> to_user_id)
);

create index movement_payments_family_idx on public.movement_payments (family_id);
create index reimbursements_family_created_idx
  on public.reimbursements (family_id, created_at desc);

create or replace function public.saldi_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger movement_payments_set_updated_at
  before update on public.movement_payments
  for each row
  execute function public.saldi_set_updated_at();

alter table public.movement_payments enable row level security;
alter table public.movement_payment_shares enable row level security;
alter table public.reimbursements enable row level security;

create policy "movement_payments_select_member"
  on public.movement_payments for select to authenticated
  using (family_id = public.current_user_family_id());

create policy "movement_payments_insert_member"
  on public.movement_payments for insert to authenticated
  with check (family_id = public.current_user_family_id());

create policy "movement_payments_update_member"
  on public.movement_payments for update to authenticated
  using (family_id = public.current_user_family_id())
  with check (family_id = public.current_user_family_id());

create policy "movement_payments_delete_member"
  on public.movement_payments for delete to authenticated
  using (family_id = public.current_user_family_id());

create policy "movement_payments_no_anon"
  on public.movement_payments for all to anon
  using (false) with check (false);

create policy "movement_payment_shares_select_member"
  on public.movement_payment_shares for select to authenticated
  using (
    exists (
      select 1
      from public.movement_payments p
      where p.id = payment_id
        and p.family_id = public.current_user_family_id()
    )
  );

create policy "movement_payment_shares_insert_member"
  on public.movement_payment_shares for insert to authenticated
  with check (
    exists (
      select 1
      from public.movement_payments p
      where p.id = payment_id
        and p.family_id = public.current_user_family_id()
    )
  );

create policy "movement_payment_shares_update_member"
  on public.movement_payment_shares for update to authenticated
  using (
    exists (
      select 1
      from public.movement_payments p
      where p.id = payment_id
        and p.family_id = public.current_user_family_id()
    )
  )
  with check (
    exists (
      select 1
      from public.movement_payments p
      where p.id = payment_id
        and p.family_id = public.current_user_family_id()
    )
  );

create policy "movement_payment_shares_delete_member"
  on public.movement_payment_shares for delete to authenticated
  using (
    exists (
      select 1
      from public.movement_payments p
      where p.id = payment_id
        and p.family_id = public.current_user_family_id()
    )
  );

create policy "movement_payment_shares_no_anon"
  on public.movement_payment_shares for all to anon
  using (false) with check (false);

create policy "reimbursements_select_member"
  on public.reimbursements for select to authenticated
  using (family_id = public.current_user_family_id());

create policy "reimbursements_insert_member"
  on public.reimbursements for insert to authenticated
  with check (family_id = public.current_user_family_id());

create policy "reimbursements_update_member"
  on public.reimbursements for update to authenticated
  using (family_id = public.current_user_family_id())
  with check (family_id = public.current_user_family_id());

create policy "reimbursements_delete_member"
  on public.reimbursements for delete to authenticated
  using (family_id = public.current_user_family_id());

create policy "reimbursements_no_anon"
  on public.reimbursements for all to anon
  using (false) with check (false);
