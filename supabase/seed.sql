-- Seed per ambienti non-prod (dopo le migrazioni).
-- Auth users e family_members: scripts/seed-mock-users.mjs

insert into public.members (email, role, full_name)
values
  ('admin@hestia.dev', 'admin', 'Admin Dev'),
  ('partner@hestia.dev', 'user', 'Partner Dev')
on conflict (email) do nothing;

insert into public.families (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Famiglia Dev')
on conflict (id) do nothing;
