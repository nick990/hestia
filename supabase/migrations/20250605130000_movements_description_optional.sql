-- Descrizione movimento opzionale

alter table public.movements
  drop constraint if exists movements_description_not_blank;

alter table public.movements
  alter column description drop not null;

alter table public.movements
  alter column description set default '';
