-- Pagante membro o Famiglia; backfill uscite storiche senza payment

alter table public.movement_payments
  add column payer_kind text;

update public.movement_payments
  set payer_kind = 'member'
  where payer_kind is null;

alter table public.movement_payments
  alter column payer_kind set not null,
  alter column payer_kind set default 'member';

alter table public.movement_payments
  alter column payer_user_id drop not null;

alter table public.movement_payments
  add constraint movement_payments_payer_kind_check
    check (payer_kind in ('member', 'family'));

alter table public.movement_payments
  add constraint movement_payments_payer_member_fk
    check (
      (payer_kind = 'member' and payer_user_id is not null)
      or (payer_kind = 'family' and payer_user_id is null)
    );

insert into public.movement_payments (movement_id, family_id, payer_kind, payer_user_id, split_mode)
select
  m.id,
  fm.family_id,
  case when m.assignee_kind = 'family' then 'family' else 'member' end,
  case when m.assignee_kind = 'family' then null else m.assignee_user_id end,
  'equal'
from public.movements m
join public.family_members fm on fm.user_id = m.created_by
where m.type = 'expense'
  and m.is_private = false
  and not exists (
    select 1 from public.movement_payments mp where mp.movement_id = m.id
  );

insert into public.movement_payment_shares (payment_id, user_id, amount)
select mp.id, mp.payer_user_id, m.amount
from public.movement_payments mp
join public.movements m on m.id = mp.movement_id
where mp.payer_kind = 'member'
  and mp.payer_user_id is not null
  and not exists (
    select 1 from public.movement_payment_shares s where s.payment_id = mp.id
  )
  and m.assignee_kind = 'member'
  and m.type = 'expense'
  and not m.is_private;
