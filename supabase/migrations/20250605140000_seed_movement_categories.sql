-- Categorie iniziali (catalogo globale)

insert into public.movement_categories (name)
select v.name
from (
  values
    ('auto'),
    ('auto.assicurazione'),
    ('auto.bollo'),
    ('auto.lavaggi'),
    ('auto.manutenzione'),
    ('casa'),
    ('casa.arredo'),
    ('casa.assicurazione'),
    ('casa.corrente comune'),
    ('casa.mutuo'),
    ('casa.piscina'),
    ('casa.pulizia'),
    ('casa.tasse'),
    ('casa.manutenzione'),
    ('uscite'),
    ('uscite.bar'),
    ('uscite.ristoranti'),
    ('uscite.feste'),
    ('intrattenimento'),
    ('intrattenimento.spettacoli'),
    ('intrattenimento.abbonamenti'),
    ('intrattenimento.libri'),
    ('misc'),
    ('monade.rimborsi'),
    ('monade.stipendio'),
    ('monade.buoni acquisto'),
    ('monade.buoni spesa'),
    ('persona'),
    ('persona.fumo'),
    ('persona.salute'),
    ('persona.palestra'),
    ('persona.estetista'),
    ('persona.parrucchiera'),
    ('persona.regali'),
    ('persona.sport'),
    ('persona.abbigliamento'),
    ('persona.gioco'),
    ('spesa'),
    ('spesa.alimentare'),
    ('trasporti'),
    ('trasporti.carburante'),
    ('trasporti.multe'),
    ('trasporti.parcheggi'),
    ('trasporti.telepass'),
    ('utenze'),
    ('utenze.banche'),
    ('utenze.corrente'),
    ('utenze.gas'),
    ('utenze.internet'),
    ('utenze.telefono'),
    ('utenze.acqua'),
    ('viaggi'),
    ('viaggi.gite'),
    ('lavoro extra'),
    ('investimenti')
) as v(name)
where not exists (
  select 1
  from public.movement_categories c
  where lower(trim(c.name)) = lower(trim(v.name))
);
