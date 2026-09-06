alter table public.reimbursements
  add column if not exists occurred_on date;

update public.reimbursements
  set occurred_on = created_at::date
  where occurred_on is null;

alter table public.reimbursements
  alter column occurred_on set not null;

alter table public.reimbursements
  alter column occurred_on set default current_date;

drop index if exists reimbursements_family_created_idx;

create index if not exists reimbursements_family_occurred_created_idx
  on public.reimbursements (family_id, occurred_on desc, created_at desc);
