-- L'elenco note è ordinato per data di creazione: modificare una nota non la sposta.

drop index if exists public.notes_personal_updated_idx;
drop index if exists public.notes_family_updated_idx;

create index notes_personal_created_idx
  on public.notes (user_id, created_at desc)
  where scope = 'personal';

create index notes_family_created_idx
  on public.notes (family_id, created_at desc)
  where scope = 'family';
