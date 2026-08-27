# Design: home mobile a tab (Cashflow e Notes)

**Data:** 2026-08-27  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Dipendenze:** home mobile attuale (`app/(protected)/page.tsx`, `components/home/mobile-home.tsx`); Notes (`2026-08-27-notes-design.md`); nav e redirect desktop (`2026-06-05-nav-settings-categories-design.md`)  
**Sostituisce:** in `2026-08-27-notes-design.md`, R17 («Notes non entra in home in v1») per il **telefono**. Desktop invariato.

## Obiettivo

Sul telefono, `/` diventa un guscio a tab: una riga di icone sempre visibile (Cashflow, Notes) e sotto la **vista**, cioè l’area che cambia. Tab Cashflow = home movimenti di oggi. Tab Notes = stessa UI della pagina `/notes`. Desktop, `/cashflow` completa e `/notes` restano com’è.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Solo **telefono**: `/` mostra guscio + tab + vista. Desktop: `/` continua a reindirizzare a `/cashflow` |
| R2 | Header Hestia + menu hamburger **invariati**. La riga tab sta sotto, sticky mentre si scorre la vista |
| R3 | Due tab: **Cashflow** (default) e **Notes**. Tab scelto nell’URL: `tab=cashflow` \| `tab=notes` |
| R4 | `/` senza `tab`, o `tab` sconosciuto → Cashflow |
| R5 | Vista Cashflow = contenuto attuale di `MobileHome` (mese, filtri assegnatario, totali, ultimi movimenti, FAB +) |
| R6 | Vista Notes = stesso componente `NotesPage` usato da `/notes` |
| R7 | `/notes` resta pagina autonoma **senza** riga tab. Il menu Notes continua a puntare a `/notes` |
| R8 | `/cashflow` resta la pagina completa (tabella, mesi, Sankey). Il menu Cashflow continua a puntare a `/cashflow` |
| R9 | Cambio tab = navigazione link (`/?tab=…`), non solo stato client. Indietro e refresh tengono il tab |
| R10 | `from`/`to` restano nell’URL anche sul tab Notes, così tornando a Cashflow il mese è lo stesso |
| R11 | Cambio mese nella vista Cashflow aggiorna `from`/`to` e tiene `tab=cashflow` (o lo omette se è il default, ma non perde il mese) |
| R12 | FAB «Aggiungi movimento» solo nella vista Cashflow |
| R13 | Tab: icona + nome corto; bersaglio 44px; `aria-current` sul selezionato |
| R14 | Colore Cashflow = terracotta brand. Colore Notes = umber (stesso caldo, più spento). Mai verde/rosso sezione |
| R15 | Selezionato = disco tinta della sezione + icona più scura. A riposo = icona nel colore, senza disco. Focus = anello di sistema |
| R16 | Cambio vista: crossfade breve; con `prefers-reduced-motion` istantaneo |
| R17 | `/` carica in parallelo dati Cashflow e Notes. Errore di una query: quella vista fallisce, guscio e l’altra vista restano usabili dove possibile |
| R18 | Documentazione utente (`docs/manuale`) e `MANUAL_TEST.md` aggiornate in implementazione |

## Fuori scope (questa passata)

- Tab sul desktop
- Riga tab su `/cashflow` o `/notes`
- Altre sezioni (Impostazioni, famiglie, categorie) come tab
- Persistenza tab sul server (l’URL basta)
- Sostituire o togliere il menu hamburger
- Cambiare il contenuto della home movimenti
- Icone tab senza etichetta testuale
- Realtime

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Superficie | Solo home **mobile** (`/`) |
| `/cashflow` e nav | Restano. Tab Cashflow ≠ pagina completa |
| `/notes` e nav | Restano pagina autonoma, stesso contenuto del tab, **senza** icone |
| Routing tab | Query `tab` su `/` (approccio A) |
| Area che cambia | **Vista** (nome interno/spec, non etichetta UI) |
| Dati | Prefetch entrambe le viste sulla page `/` |
| Chrome | Header attuale + riga tab sotto, sticky |

## Routing

### Telefono

| URL | Cosa si vede |
|-----|----------------|
| `/` | Guscio, tab Cashflow, vista home movimenti, mese corrente |
| `/?tab=cashflow` | Come `/` |
| `/?tab=notes` | Guscio, tab Notes, vista `NotesPage` |
| `/?tab=notes&from=…&to=…` | Tab Notes; `from`/`to` conservati per il ritorno a Cashflow |
| `/?tab=foo` | Come Cashflow |
| `/notes` | `NotesPage` senza guscio tab |
| `/cashflow` | Pagina completa, senza guscio tab |

### Desktop

Invariato: login e `/` → `/cashflow`. Nessun guscio tab.

### Costruzione link tab

I link di `HomeTabs` copiano i search params correnti e impostano `tab`. Esempio: da `/?from=2026-08-01&to=2026-08-31` il link Notes è `/?tab=notes&from=2026-08-01&to=2026-08-31`.

Cambio mese (oggi `router.push('/?from&to')`): deve includere `tab=cashflow` se si vuole esplicito, o omettere `tab` (default Cashflow) **senza** cancellare `from`/`to`.

Helper unico: `parseHomeTab(searchParams)` e `buildHomeSearchParams({ tab, from, to })` in `lib/home/` (o equivalente), con test.

## UI

```
┌─────────────────────────────┐
│ Hestia                 menu │  header esistente (h-14)
├─────────────────────────────┤
│   [Cashflow]    [Notes]     │  HomeTabs sticky
├─────────────────────────────┤
│                             │
│         vista               │  CashflowHome o NotesPage
│                             │
└─────────────────────────────┘
```

- Tab: due colonne centrate, gap comodo per il pollice, non allargate a tutta larghezza come una bottom-nav da cinque voci.
- Icone: lucide, stesso peso della nav. Cashflow: portafoglio o banconota (scegliere una e tenerla). Notes: nota / sticky-note.
- Vista Cashflow: altezza come oggi (`100dvh` meno header); **sottrarre anche l’altezza di HomeTabs** così il FAB non copre i tab e lo scroll resta nel riquadro.
- Vista Notes: la pagina Notes di oggi, nello stesso riquadro scrollabile. Il titolo «Notes» della pagina può restare o ridursi: se i tab già dicono Notes, il `h1` in vista è ridondante; **nasconderlo nella vista home**, lasciarlo su `/notes`.

## Componenti e file

| Pezzo | Ruolo |
|-------|--------|
| `app/(protected)/page.tsx` | Server: user-agent come oggi; se mobile, carica movimenti **e** notes/prefs; render `HomeShell` |
| `components/home/home-shell.tsx` | Layout: `HomeTabs` + slot vista |
| `components/home/home-tabs.tsx` | Link tab, stato selezionato, colori |
| `lib/home/tab.ts` | Parse/build `tab` + conservazione `from`/`to` |
| `components/home/mobile-home.tsx` | Vista Cashflow; push URL deve passare da `buildHomeSearchParams` |
| `components/notes/notes-page.tsx` | Invariato; usato da `/` e `/notes` |
| `app/(protected)/notes/page.tsx` | Invariato (senza shell) |

Rilevamento mobile: stesso `isMobileUserAgent` del middleware. Nessun tab shell se desktop.

## Errori e loading

- `loading.tsx` di `/`: header (già nel layout) + placeholder tab + scheletro vista.
- Fallimento fetch Notes: tab Notes mostra errore in vista, Cashflow usabile.
- Fallimento fetch movimenti: tab Cashflow mostra errore, Notes usabile.
- Se il fallimento è auth/sessione: comportamento attuale (redirect login).

## Test

- `parseHomeTab`: missing → cashflow; `notes` → notes; junk → cashflow.
- `buildHomeSearchParams`: imposta tab; copia `from`/`to`; tab default può omettere `tab`.
- Checklist `MANUAL_TEST.md`: telefono, cambio tab, refresh, indietro, mese conservato, `/notes` senza tab, desktop senza tab su `/`.

## Manuale utente

In `docs/manuale/index.md` (e se serve cashflow/notes): sul telefono la home ha due tab, Cashflow e Notes. Dal menu si aprono ancora le pagine complete `/cashflow` e `/notes`.
