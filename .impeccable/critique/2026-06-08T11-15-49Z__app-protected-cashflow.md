---
target: cashflow
total_score: 28
p0_count: 0
p1_count: 0
p2_count: 2
timestamp: 2026-06-08T11-15-49Z
slug: app-protected-cashflow
---
# Critique: Cashflow (aggiornata post-layout)

**Target:** `app/(protected)/cashflow` + `components/cashflow/*`  
**Data:** 2026-06-08  
**Register:** product · North Star: La Bacheca Familiare

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toast, `pending`, mese evidenziato nella griglia; nessuna etichetta testuale del periodo attivo |
| 2 | Match System / Real World | 3 | Italiano coerente; «Vista personale» + quota ÷N ancora poco immediati |
| 3 | User Control and Freedom | 3 | Annulla sui dialog, filtri cancellabili, griglia anno collassabile |
| 4 | Consistency and Standards | 3 | shadcn coerente; voce Cashflow in nav senza stato active |
| 5 | Error Prevention | 3 | Conferma eliminazione, validazione server |
| 6 | Recognition Rather Than Recall | 3 | Riepilogo periodo subito sotto i filtri; griglia mesi nascosta di default |
| 7 | Flexibility and Efficiency | 2 | Sort/filter tabella ok; FAB mobile; niente scorciatoie tastiera |
| 8 | Aesthetic and Minimalist Design | 3 | Gerarchia migliorata; griglia 6×6 ancora densa quando espansa |
| 9 | Error Recovery | 3 | Errori toast in italiano |
| 10 | Help and Documentation | 2 | Solo nota sotto checkbox share |
| **Total** | | **28/40** | **Good — solid foundation, P2 residui** |

## Cognitive Load

**2 fallimenti su 8** → carico cognitivo **moderato** (era alto).

- ✅ **Visual hierarchy:** summary periodo in evidenza subito dopo ViewFilter
- ✅ **Single focus:** blocco «periodo corrente» separato da anno e tabella
- ❌ **Working memory:** regole «Vista personale» ancora da decodificare
- ❌ **Minimal choices:** griglia espansa = 12 celle × 4 cifre (accettabile perché collassata di default, ma pesante su mobile se aperta)

## Anti-Patterns Verdict

**LLM assessment:** Non AI slop. Terracotta + semantica income/expense distintiva. Layout ora rispetta «bacheca familiare»: totali prima, navigazione anno secondaria.

**Deterministic scan:** 0 findings su markup cashflow.

**Browser visualization:** Non eseguita (pagina protetta, nessun overlay).

## Overall Impression

Il salto rispetto alla critique precedente (26→28) viene soprattutto da **gerarchia** e **mobile**. Cashflow è usabile; i fix rimasti sono copy e rifiniture, non struttura.

## What's Working

1. **Above-the-fold corretto:** filtri → totali periodo → date picker → anno collassabile → tabella
2. **FAB mobile** per «Aggiungi movimento» allineato a PRODUCT #2
3. **Palette e semantica** coerenti con DESIGN.md terracotta/salvia

## Priority Issues

### [P2] Checkbox «Vista personale» opaca
- **Why:** Label non comunica la ripartizione ÷N; testo esplicativo troppo lungo sotto il checkbox
- **Fix:** Rinominare («Ripartisci spese famiglia»), tooltip/popover, badge stato nel summary quando attivo
- **Command:** `/impeccable clarify cashflow`

### [P2] Nav senza stato active su Cashflow
- **Why:** Impostazioni evidenzia la voce corrente; Cashflow no
- **Fix:** `pathname` in `AppNav`, stile active come `SettingsNav`
- **Command:** `/impeccable polish app-nav`

### [P3] Griglia 6×6 illeggibile su mobile quando espansa
- **Why:** 4 importi per cella in `text-xs` su schermi stretti
- **Fix:** `grid-cols-3 sm:grid-cols-6` quando espansa, o scroll solo sotto `sm`
- **Command:** `/impeccable adapt cashflow`

## Persona Red Flags

**Sara (dopo spesa):** FAB risolve l'aggiunta rapida. Totali mese visibili subito. OK.

**Luca (fine mese):** Netto periodo in secondo schermo, non serve più scrollare la griglia anno. OK.

**Jordan:** Ancora bloccato su «Vista personale» senza leggere il paragrafo sotto.

**Casey:** Griglia espansa su telefono piccolo resta illeggibile; tenere chiusa di default aiuta ma non basta se la apre.

## Minor Observations

- Totali anno + totali periodo convivono: utile ma ridondante visivamente
- `DESIGN.md` Overview menziona ancora «Strumento Chiaro achromatico» (drift post-colorize)
- Card wrapper unica con titolo+descrizione ripetitivi

## Questions to Consider

- «Vista personale» è il termine che usate a voce in famiglia?
- La griglia mesi deve restare 6×6 su mobile o può diventare 3×4?
- Merge del branch `impeccable` su `main` o altre sezioni prima?
