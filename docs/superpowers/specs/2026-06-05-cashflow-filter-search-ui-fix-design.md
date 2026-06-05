# Design fix: ricerca popover filtro colonna Cashflow

**Data:** 2026-06-05  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia  
**Corregge:** `2026-06-05-cashflow-table-sort-filter-design.md`

## Problema

Con filtro colonna attivo (es. categoria `auto.manutenzione` spuntata), digitare «casa» nel campo Cerca e usare «Seleziona tutto» fa sparire dalla tabella le voci già selezionate che non contengono «casa», anche se le relative checkbox restano spuntate. Per vederle di nuovo bisogna cancellare il testo di ricerca.

**Causa:** `search` era salvato in `filterValue` e `matchesFacetedFilter` applicava AND tra testo e checkbox sulle righe tabella, in contrasto con la spec popover («Cerca filtra solo la lista checkbox»).

## Decisione

**Approccio A — Excel puro:** il campo Cerca è solo UI per restringere la lista checkbox. Le righe tabella si filtrano **esclusivamente** per `selectedValues`.

## Comportamento corretto

| Azione | Tabella | Popover |
|--------|---------|---------|
| Digita nel Cerca | Nessun effetto | Restringe lista checkbox |
| Spunta/deseleziona | Filtra per selezione | Aggiorna checkbox |
| Seleziona tutto | Aggiunge/rimuove voci visibili dalla selezione | Toggle su voci visibili |
| Cancella filtro | Reset filtro colonna | Reset ricerca + selezione |

## Modifiche tecniche

1. `FacetedColumnFilterValue` → `{ selectedValues: string[] }` (rimuovere `search`)
2. `matchesFacetedFilter` → solo `selectedValues.includes(display)`
3. `isFacetedFilterActive` → `selectedValues.length > 0`
4. `column-faceted-filter.tsx` → `search` in `useState` locale, mai in `setFilterValue`
5. Test: rimuovere AND search+checkbox su righe; confermare filtro solo per selezione

## Fuori scope

- Filtro live solo-testo senza checkbox
- Altre colonne o ordinamento

## Test manuali

1. Seleziona `auto.manutenzione` → visibile in tabella
2. Cerca «casa», Seleziona tutto → visibili `auto.manutenzione` **e** voci casa
3. Deseleziona tutto con ricerca attiva → rimuove solo voci visibili; altre selezioni restano
4. Cancella filtro → reset completo
