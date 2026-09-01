-- Categoria in evidenza per famiglia (tab home + budget netto)

create table public.family_featured_settings (
  family_id uuid primary key references public.families (id) on delete cascade,
  category_name text,
  budget numeric,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.family_featured_settings enable row level security;

create policy "family_featured_settings_select_member"
  on public.family_featured_settings for select to authenticated
  using (family_id = public.current_user_family_id());

create policy "family_featured_settings_insert_member"
  on public.family_featured_settings for insert to authenticated
  with check (family_id = public.current_user_family_id());

create policy "family_featured_settings_update_member"
  on public.family_featured_settings for update to authenticated
  using (family_id = public.current_user_family_id())
  with check (family_id = public.current_user_family_id());

create policy "family_featured_settings_no_anon"
  on public.family_featured_settings for all to anon
  using (false) with check (false);
