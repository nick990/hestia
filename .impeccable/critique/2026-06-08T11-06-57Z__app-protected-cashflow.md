---
target: cashflow
total_score: 26
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-06-08T11-06-57Z
slug: app-protected-cashflow
---
# Critique: Cashflow

**Target:** `app/(protected)/cashflow` + `components/cashflow/*`  
**Data:** 2026-06-08  
**Register:** product · North Star: La Bacheca Familiare

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toast e stati `pending` ok; nessun indicatore periodo attivo oltre ai date picker |
| 2 | Match System / Real World | 3 | Italiano coerente; «Vista personale» + testo quota ÷N richiede lettura attenta |
| 3 | User Control and Freedom | 3 | Annulla/Esci sui dialog; filtri tabella cancellabili; niente undo |
| 4 | Consistency and Standards | 3 | shadcn coerente; nav Cashflow senza stato active (Impostazioni sì) |
| 5 | Error Prevention | 3 | Conferma eliminazione; validazione server; toggle visibilità protetto |
| 6 | Recognition Rather Than Recall | 2 | Riepilogo periodo sotto griglia 12 mesi; share mode da memorizzare |
| 7 | Flexibility and Efficiency | 2 | Sort/filter tabella buoni; zero scorciatoie tastiera; Sankey secondario |
| 8 | Aesthetic and Minimalist Design | 2 | Metriche duplicate (anno + periodo); griglia mensile molto densa |
| 9 | Error Recovery | 3 | Errori toast in italiano; form non si resetta su errore server |
| 10 | Help and Documentation | 2 | Solo nota sotto checkbox share; niente guida contestuale generale |
| **Total** | | **26/40** | **Acceptable — miglioramenti significativi prima di considerarla «pronta»** |

## Cognitive Load

**5 fallimenti su 8** → carico cognitivo **alto**.

- ❌ **Single focus:** ViewFilter + YearSummaryBar + DateRange + summary + tabella competono per attenzione
- ❌ **Minimal choices:** 12 celle mese × 4 cifre ciascuna; 3 tab vista + checkbox share
- ❌ **Visual hierarchy:** totali periodo (domanda principale) compaiono dopo la griglia annuale
- ❌ **Working memory:** spiegazione quota famiglia richiede di tenere a mente regole diverse per entrate/uscite
- ⚠️ **Chunking:** summary cards ok (3), year bar no (12 unità parallele)

## Anti-Patterns Verdict

**LLM assessment:** Non sembra «AI slop» classico. Nessun cream, gradienti, eyebrow uppercase, hero-metric. Estetica shadcn familiare con terracotta e semantica verde/rosso: passa il product slop test. Il rischio è **densità da tool finanziario** (griglia annuale + metriche duplicate), non genericità AI.

**Deterministic scan:** `detect.mjs` su `app/(protected)/cashflow`, `components/cashflow`, `app-nav` → **0 findings** (exit 0). Nessun side-stripe, gradient text, o pattern vietati nel markup.

**Browser visualization:** Non disponibile. Playwright MCP richiede setup test e `/cashflow` è protetta (redirect login). Nessun overlay iniettato.

## Overall Impression

Cashflow è **funzionale e on-brand** dopo colorize: semantica finanziaria chiara, copy italiano diretto, pattern tabella/dialog familiari. Il problema principale è **gerarchia informativa**: l'utente che apre la pagina per capire «com'è andato questo mese?» deve attraversare filtri, riepilogo annuale e griglia 12 mesi prima di vedere i totali del periodo selezionato. Su mobile, la CTA «Aggiungi movimento» resta in alto, lontana dalla thumb zone.

## What's Working

1. **Semantica colore post-colorize:** `text-income` / `text-destructive`, pannelli summary tintati, toggle Entrata/Uscita nel form: rispondono subito a «dove va il denaro?» senza decorazione inutile.
2. **Trasparenza condivisa:** ViewFilter (Tutti/Famiglia/Privati), badge «Privato», colonna autore in vista famiglia: principio PRODUCT #4 rispettato nel codice.
3. **Tabella operativa:** sort, filtri faceted, riga «Filtrato:» nei summary, empty state con CTA: toolchain da product UI matura.

## Priority Issues

### [P1] Riepilogo periodo troppo in basso nella pagina
- **Why:** L'utente cerca prima i totali del periodo corrente; oggi compaiono dopo `YearSummaryBar` (griglia 12 mesi) e i controlli data.
- **Fix:** Spostare `PeriodSummaryCards` subito sotto `ViewFilter` (o sotto header card), sopra la griglia annuale. La griglia anno diventa strumento di navigazione secondario.
- **Command:** `/impeccable layout cashflow`

### [P1] Griglia mensile sovraccarica mobile e desktop
- **Why:** 12 celle con 4 numeri ciascuna = 48 cifre visibili; su mobile `grid-cols-6` rende celle illeggibili. Violazione chunking (≤4) e thumb reach.
- **Fix:** Collassare in carousel/riga scrollabile, o mostrare solo mese corrente + frecce con tooltip; dettaglio mese on demand.
- **Command:** `/impeccable adapt cashflow`

### [P1] CTA «Aggiungi movimento» non prioritaria su mobile
- **Why:** PRODUCT: «Azione prima del report»; bottone primario è in riga con date picker in alto a destra, irraggiungibile one-handed.
- **Fix:** FAB sticky bottom su `sm:` breakpoint, o barra azioni fissa sotto summary.
- **Command:** `/impeccable adapt cashflow`

### [P2] Checkbox «Vista personale» opaca
- **Why:** Label corta vs regole complesse (uscite ÷N, entrate solo mie). Jordan abbandona qui.
- **Fix:** Rinominare in «Ripartisci spese famiglia» o simile; spostare spiegazione in tooltip/popover; stato attivo visibile nel summary («Quota personale attiva»).
- **Command:** `/impeccable clarify cashflow`

### [P2] Nav senza stato active su Cashflow
- **Why:** In Impostazioni la voce attiva è evidente; su Cashflow no → disorientamento su quale sezione si è.
- **Fix:** `usePathname` in `AppNav`, stile active come `SettingsNav`.
- **Command:** `/impeccable polish app-nav`

## Persona Red Flags

**Alex (Power User):** Deve scrollare la griglia anno per ogni consultazione rapida. Aggiungere movimento = dialog modale, niente scorciatoia tastiera. Sankey richiede click extra e movimenti presenti.

**Jordan (First-Timer):** «Vista personale» non spiega da sola la quota ÷ membri. Griglia 12 mesi con 4 numeri per cella senza legenda. Non capisce differenza tra periodo (date picker) e anno (frecce anno) senza esplorazione.

**Casey (Mobile):** «Aggiungi movimento» in alto a destra. Griglia 6 colonne con testo `text-xs`. Nessun FAB. Interruzione mid-flow perde stato URL ma dati persistono (ok).

**Sara (Registra dopo la spesa):** Dopo la spesa al supermercato apre l'app: deve scrollare oltre riepilogo anno prima dei totali mese; il percorso rapido è un bottone piccolo in header, non dominante.

**Luca (Fine mese):** Vuole netto mese in 3 secondi; oggi il netto periodo è quarto blocco verticale, dopo anno e filtri data.

## Minor Observations

- Card wrapper unica avvolge tutto: titolo «Cashflow» + descrizione ripetono il contesto senza aggiungere info.
- Sankey come `variant="outline"` secondario: ok per power user, poca discoverability.
- `DESIGN.md` Overview ancora dice «Strumento Chiaro achromatico» mentre primary è terracotta (drift doc).
- Mese evidenziato usa `border-primary` + `bg-primary/5`: buon uso accent, coerente con brand.

## Questions to Consider

- Se l'80% delle sessioni è «quanto ho speso questo mese?», la griglia annuale merita metà pagina o può essere collassata?
- Su mobile, il riepilogo mese + FAB aggiungi potrebbe essere l'intera above-the-fold?
- «Vista personale» è il termine che la coppia usa a voce, o serve linguaggio più domestico?
