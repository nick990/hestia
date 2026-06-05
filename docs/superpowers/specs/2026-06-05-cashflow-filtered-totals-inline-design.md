# Design: totali filtrati inline nei box riepilogo

**Data:** 2026-06-05  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia  
**Estende:** `2026-06-05-cashflow-table-sort-filter-design.md`

## Obiettivo

Evitare il layout shift della tabella movimenti quando si applicano filtri colonna. I totali filtrati compaiono **dentro i tre box esistenti** (Entrate, Uscite, Netto) come seconda riga in testo piccolo, senza cambiare l’altezza dei box al toggle del filtro.

## Problema attuale

`MovementsTable` renderizza un blocco separato «Totali filtrati» sopra la griglia quando `columnFilters` è attivo. Questo sposta la tabella verso il basso.

## Comportamento target

### Box riepilogo periodo

Ogni box mantiene il totale periodo (grande, da `summary` server). Sotto il valore principale, uno **slot a altezza fissa** (`min-h-4`) mostra:

```
Filtrato: € 800,00
```

- Visibile solo con filtro colonna attivo
- `text-xs`, colori coerenti (entrate verde, netto verde/rosso)
- Senza filtro: slot vuoto ma presente (nessun layout shift)

### Box Netto

```
Netto
€ 1.200,00
Filtrato: € 400,00    ← solo con filtro
entrate − uscite      ← sempre
```

### Tabella

Nessun blocco aggiuntivo sopra la griglia. Posizione tabella invariata con o senza filtro.

## Architettura

| File | Modifica |
|------|----------|
| `components/cashflow/period-summary-cards.tsx` | Nuovo: tre box con slot filtrato |
| `components/cashflow/movements-table.tsx` | Rimuove blocco totali filtrati; callback `onFilterSummaryChange` |
| `components/cashflow/movements-manager.tsx` | Stato filtrato; compone `PeriodSummaryCards` |

### Callback

```ts
type FilterSummaryState = {
  active: boolean;
  summary: MonthSummary;
};

onFilterSummaryChange(state: FilterSummaryState): void
```

Invocato da `MovementsTable` quando cambiano `columnFilters` o righe filtrate (`useEffect`).

## Fuori scope

- Totali filtrati nel riepilogo annuale
- Animazioni fade
- Modifica formato euro

## Test manuali

1. Applica filtro → «Filtrato: €…» nei tre box; tabella non si sposta
2. Rimuovi filtro → righe scompaiono; altezza box invariata
3. Valori filtrati corretti
4. Cambio periodo → reset filtri e righe filtrate
