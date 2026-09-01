# Design: home dashboard con tab e navigazione unificata

**Data:** 2026-09-01  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Dipendenze:** `2026-08-27-mobile-home-tabs-design.md`, `2026-08-27-notes-design.md`, `2026-06-05-nav-settings-categories-design.md`  
**Sostituisce / aggiorna:** in `2026-08-27-mobile-home-tabs-design.md`, R1 (redirect desktop `/` → `/cashflow`) e la sezione «Desktop invariato»

## Obiettivo

Allineare la navigazione: **`/`** è la home con tab (Cashflow + Notes) su **tutti i dispositivi**; **`/cashflow`** resta la pagina completa raggiungibile dal menu. Su **mobile**, la pagina `/cashflow` usa la stessa lista movimenti della tab Cashflow in home (`HomeMovements`), non la tabella.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | **`/`** mostra guscio + tab + vista su **mobile e desktop**. Nessun redirect desktop a `/cashflow` |
| R2 | Header Hestia + menu hamburger invariati. Riga tab sotto l’header, sticky durante lo scroll della vista |
| R3 | Due tab: **Cashflow** (default) e **Notes**. Tab nell’URL: `tab=cashflow` \| `tab=notes` |
| R4 | `/` senza `tab`, o `tab` sconosciuto → Cashflow |
| R5 | Tab Cashflow = `MobileHome` (layout **compatto** uguale al mobile attuale; su desktop solo più margine laterale) |
| R6 | Tab Notes = `NotesPage` con `hideTitle` |
| R7 | `/notes` resta pagina autonoma **senza** riga tab. Menu **Notes** → `/notes` |
| R8 | `/cashflow` resta pagina completa. Menu **Cashflow** → `/cashflow` |
| R9 | Nuova voce nav **Home** → `/`, attiva solo quando `pathname === "/"` |
| R10 | Ordine nav: **Home · Cashflow · Notes · Impostazioni** (desktop e menu mobile) |
| R11 | Sul tab Notes in home, in nav resta attiva **Home** (non Notes) |
| R12 | Post-login, callback auth e redirect membro → **`/`** (non `/cashflow`) |
| R13 | Logo **Hestia** → **`/`** (già così; verificare che resti) |
| R14 | `/dashboard` → redirect **`/`** (non `/cashflow`) |
| R15 | Cambio tab = navigazione URL; Indietro e refresh conservano tab e `from`/`to` |
| R16 | FAB «Aggiungi movimento» solo tab Cashflow in home e su `/cashflow` mobile |
| R17 | **`/cashflow` mobile (`< md`)**: filtri periodo, filtri assegnatario, totali, riepilogo annuale e Sankey **invariati**; sezione movimenti = **`HomeMovements`** al posto di `MovementsTable` |
| R18 | **`/cashflow` desktop (`≥ md`)**: tabella, filtri colonna, Sankey — **invariati** |
| R19 | Tap su riga in `HomeMovements` (home o `/cashflow` mobile) → stesso dialog modifica |
| R20 | Documentazione (`docs/manuale`, `MANUAL_TEST.md`) aggiornata in implementazione |

## Fuori scope

- Redesign visivo dei tab su desktop (stesso chrome mobile, più margini)
- Widget dashboard oltre Cashflow + Notes
- Tab Cashflow/Notes su `/cashflow` o `/notes`
- Unificare `/notes` con home (resta pagina autonoma dal menu)
- Rimuovere menu hamburger
- Realtime

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Home | Guscio tab attuale (`HomeShell`), uguale ovunque |
| Nav Cashflow | Resta su `/cashflow` |
| Nav Home | Nuova voce, attiva solo su `/` |
| Layout tab Cashflow | Compatto come mobile (approccio A) |
| `/cashflow` mobile movimenti | `HomeMovements` via breakpoint (approccio A) |
| Implementazione | Routing + nav minimi; switch lista/tabella in `MovementsManager` |

## Routing

| URL | Comportamento |
|-----|----------------|
| `/` | Home tab (Cashflow default) — **tutti i device** |
| `/?tab=notes` | Home tab Notes |
| `/cashflow` | Pagina completa; lista compatta su mobile |
| `/notes` | Notes senza tab shell |
| `/dashboard` | Redirect → `/` |
| Login / callback | Redirect → `/` |

### Middleware

- **Rimuovere** il blocco che reindirizza `GET /` → `/cashflow` quando `!isMobileUserAgent`.
- **Aggiornare** redirect `/dashboard` → `/` (pathname `/`, search vuota).
- Login già mobile → `/`: lasciare coerente **sempre** → `/`.

### Auth e redirect

File da allineare a **`/`** come destinazione default:

- `app/auth/callback/route.ts`
- `lib/auth/member.ts`
- `lib/supabase/middleware.ts` (post-login da `/login`)

## Navigazione

```
Home · Cashflow · Notes · Impostazioni
```

| Voce | href | Attiva |
|------|------|--------|
| Home | `/` | `pathname === "/"` |
| Cashflow | `/cashflow` | path sotto `/cashflow` |
| Notes | `/notes` | path sotto `/notes` |
| Impostazioni | `/settings` | path sotto `/settings` |

`navItems` e `isNavItemActive` in `components/layout/app-nav-links.tsx`. Il menu mobile riusa `navItems` (nessuna duplicazione).

## UI home `/`

Invariata rispetto a `2026-08-27-mobile-home-tabs-design.md`, salvo:

- Visibile anche su **desktop** (niente redirect).
- Contenitore `max-w-5xl` con padding laterale; tab Cashflow **non** si allarga a layout «full cashflow».

```
┌─────────────────────────────┐
│ Hestia    Home Cashflow …   │  header (h-14)
├─────────────────────────────┤
│   [Cashflow]    [Notes]     │  HomeTabs sticky
├─────────────────────────────┤
│         vista               │  MobileHome | NotesPage
└─────────────────────────────┘
```

## UI `/cashflow`

### Desktop (≥ md)

Comportamento attuale: `MovementsManager` con `MovementsTable`, `YearSummaryBar`, Sankey, pulsante «Aggiungi movimento» in header sezione.

### Mobile (< md)

```
[ DateRangeFilter ]
[ AssigneeFilterPanel se famiglia ]
[ PeriodSummaryCards ]
[ YearSummaryBar ]
[ Sankey ]
[ HomeMovements ]     ← sostituisce MovementsTable
[ FAB + ]
```

- Nessun filtro colonna tabella (non c’è tabella).
- `filterSummary` da tabella non applicabile: `PeriodSummaryCards` usa solo totali periodo (come oggi quando non ci sono filtri colonna attivi).
- Empty state movimenti: copy di `HomeMovements` (FAB +).

## Componenti e file

| File | Modifica |
|------|----------|
| `lib/supabase/middleware.ts` | Rimuovi redirect desktop `/`; `/dashboard` → `/`; login → `/` |
| `app/auth/callback/route.ts` | Default next `/` |
| `lib/auth/member.ts` | Redirect `/` |
| `components/layout/app-nav-links.tsx` | Voce Home; ordine nav; `isNavItemActive` per `/` |
| `components/cashflow/movements-manager.tsx` | `useMinMd()`: `< md` → `HomeMovements`; altrimenti tabella |
| `docs/MANUAL_TEST.md` | Home desktop, nav Home, `/cashflow` mobile lista |
| `docs/manuale/index.md` | Home su tutti i device; nav Home |

Invariati salvo verifica:

- `app/(protected)/page.tsx` — già renderizza `HomeShell` + viste
- `components/home/mobile-home.tsx`, `home-movements.tsx`
- `components/layout/app-nav.tsx` — brand già su `/`

## Test

### Unit / helper

- Nessun nuovo helper URL; regression su `lib/home/tab.test.ts`.

### Checklist manuale (da integrare in `MANUAL_TEST.md`)

- Desktop: login → `/` con tab; nav **Home** attiva; **Cashflow** → `/cashflow` con tabella.
- Mobile: `/` tab; menu **Cashflow** → `/cashflow` con **lista** (non tabella).
- Mobile `/cashflow`: tap movimento → modifica; Sankey e riepilogo annuale funzionanti.
- Tab Notes + refresh + Indietro + conservazione `from`/`to`.
- `/dashboard` → `/`.

## Manuale utente

In `docs/manuale/index.md`:

- La **home** (icona/menu **Home**) ha due tab: Cashflow (mese in corso, movimenti, +) e Notes.
- **Cashflow** nel menu apre la pagina completa (tabella su computer, lista su telefono).
- **Notes** nel menu apre la bacheca a pagina intera.

## Relazione con spec precedenti

| Spec | Effetto |
|------|---------|
| `2026-08-27-mobile-home-tabs-design.md` | R1 desktop e note «Desktop invariato» **superati** da questa spec |
| `2026-08-27-notes-design.md` | R17 home Notes su telefono: confermato; esteso a desktop home |
| `PRODUCT.md` | Allineare in implementazione: «Su desktop la home può coincidere con Cashflow» → home tab distinta da `/cashflow` |
