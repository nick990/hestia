# Cashflow — switch vista e riepilogo annuale filtrato

**Data:** 2026-06-05  
**Stato:** Approvato

## Contesto

Il filtro vista cashflow (Tutti / Famiglia / Solo miei) usa tre `Button` separati, posizionato sotto i filtri data. Il riepilogo annuale (`YearSummaryBar`) aggrega tutti i movimenti visibili via RLS, ignorando `view`.

## Obiettivi

1. Sostituire i tre bottoni con uno **switch segmentato a 3 vie** (single selection).
2. Posizionare lo switch **sopra** il riepilogo annuale.
3. Far rispettare al **riepilogo annuale** lo stesso filtro `view` di tabella e totali periodo.

## Requisiti

| ID | Requisito |
|----|-----------|
| R1 | Switch visibile solo se l'utente appartiene a una famiglia (`hasFamily`) |
| R2 | Opzioni: Tutti (`all`), Famiglia (`family`), Solo miei (`mine`) |
| R3 | Selezione → navigazione URL con `view` in query string; preservare `from`, `to`, `year` |
| R4 | Layout: switch sopra `YearSummaryBar`, full-width (tre segmenti uguali) |
| R5 | Accessibilità: `role="radiogroup"` + `role="radio"` + `aria-checked` |
| R6 | `getYearMonthlySummaries(year, view)` usa la stessa logica di `applyViewFilter` di `listMovementsForRange` |
| R7 | Cambio vista: aggiornano riepilogo anno, totali periodo, tabella; evidenziazione mese nel riepilogo resta legata a `from`/`to` |
| R8 | Utente senza famiglia: nessuno switch; riepilogo anno invariato (solo personali via RLS) |
| R9 | Navigazione anno (‹ ›) e click mese preservano `view` |

## Regole filtro per vista

| `view` | Movimenti inclusi |
|--------|-------------------|
| `all` | Personali miei + tutti `scope=family` della famiglia |
| `family` | Solo `scope=family` |
| `mine` | Solo `scope=personal` e `user_id = auth.uid()` |

## UI — segmented control

Nessun `ToggleGroup` shadcn nel progetto. Implementazione: **segmented control custom** con `Button` in contenitore `data-slot="button-group"`, stile barra unica con segmento attivo evidenziato (`variant="default"`, inattivi `variant="ghost"`).

## File

| File | Modifica |
|------|----------|
| `components/cashflow/view-filter.tsx` | Refactor UI segmented + full width |
| `components/cashflow/movements-manager.tsx` | Spostare ViewFilter sopra YearSummaryBar |
| `lib/cashflow/queries.ts` | `getYearMonthlySummaries(year, view?)` |
| `app/(protected)/cashflow/page.tsx` | Passare `view` a `getYearMonthlySummaries` |
| `docs/MANUAL_TEST.md` | Checklist riepilogo filtrato |

## Fuori scope

- Reset `view` al cambio periodo
- Nuove viste
- Filtri colonna tabella

## Test manuali

- [ ] Switch a 3 vie sopra riepilogo annuale; segmento attivo visibile
- [ ] Vista Famiglia: riepilogo anno mostra solo movimenti family (totali diversi da Tutti)
- [ ] Vista Solo miei: riepilogo esclude movimenti family propri
- [ ] Cambio vista: mese evidenziato nel riepilogo invariato se `from`/`to` non cambiano
- [ ] ‹ › anno e click mese preservano `view`
