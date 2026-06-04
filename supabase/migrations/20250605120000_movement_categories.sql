-- Categorie globali movimenti

create table public.movement_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint movement_categories_name_not_blank check (trim(name) <> '')
);

create unique index movement_categories_name_lower_unique
  on public.movement_categories (lower(trim(name)));

alter table public.movements
  add column category_id uuid references public.movement_categories (id) on delete restrict;

create index movements_category_id_idx on public.movements (category_id);

alter table public.movement_categories enable row level security;

create policy "movement_categories_select_authenticated"
  on public.movement_categories
  for select
  to authenticated
  using (true);
