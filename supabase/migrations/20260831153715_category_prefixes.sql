-- Crea i livelli intermedi (lavoro, lavoro.monade, …) se esistono solo le foglie.

with names as (
  select trim(name) as name
  from public.movement_categories
),
prefixes as (
  select distinct
    array_to_string((string_to_array(n.name, '.'))[1:i], '.') as prefix
  from names n
  cross join generate_series(
    1,
    greatest(array_length(string_to_array(n.name, '.'), 1) - 1, 0)
  ) as i
)
insert into public.movement_categories (name)
select p.prefix
from prefixes p
where p.prefix <> ''
  and not exists (
    select 1
    from public.movement_categories c
    where lower(trim(c.name)) = lower(p.prefix)
  );
