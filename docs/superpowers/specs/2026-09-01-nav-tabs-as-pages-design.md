# Design: navigazione a tab come pagine

**Data:** 2026-09-01  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Sostituisce / aggiorna:** `2026-09-01-home-dashboard-nav-design.md`, tab home con `?tab=`, voce Cashflow/Notes in header  
**Breaking:** nessuna retrocompatibilità URL (`/?tab=…` non redirectati)

## Obiettivo

Separare **header minimale** (Home, Impostazioni, account, Esci) da **navigazione operativa a tab** (Cashflow, Notes, In evidenza). Le tab diventano route dedicate; `/` è una landing vuota con «Hestia» centrata. Cashflow ha due livelli: **standard** (vista compatta) e **avanzato** (tabella completa), raggiungibile da link in fondo alla pagina standard.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Header: logo **Hestia** → `/`, voce **Home** → `/`, **Impostazioni** → `/settings`, nome account, **Esci** |
| R2 | Mobile: layout header come oggi (logo + hamburger). Hamburger: **Home**, **Impostazioni**, Esci — **no** Cashflow/Notes |
| R3 | Tab bar sotto header: **Cashflow**, **Notes**, **In evidenza** — navigazione principale |
| R4 | Tab bar visibile su `/`, `/cashflow`, `/cashflow/avanzato`, `/notes`, `/evidenza` |
| R5 | Tab bar **assente** su `/settings/*` |
| R6 | `/`: tab visibili, **nessuna selezionata**; contenuto = «Hestia» centrata (placeholder logo futuro) |
| R7 | `/cashflow`: cashflow **standard** (layout `MobileHome`: mese, totali, lista, FAB) |
| R8 | `/cashflow/avanzato`: cashflow **avanzato** (tabella, filtri colonna, Sankey, riepilogo anno) — **identico su mobile e desktop** |
| R9 | Link in fondo a `/cashflow` → `/cashflow/avanzato`, conservando `from`/`to` |
| R10 | `/notes`: Notes con tab Notes attiva |
| R11 | `/evidenza`: In evidenza con tab attiva |
| R12 | Tab selezionata = pathname (`/cashflow` e `/cashflow/avanzato` → Cashflow) |
| R13 | Query `from`/`to` solo su route cashflow; `year` solo su avanzato |
| R14 | Post-login e callback → `/` |
| R15 | `/dashboard` → redirect `/` (unico redirect mantenuto) |
| R16 | **Nessun** redirect da URL legacy (`/?tab=…`, `/?from=…` su `/`) |
| R17 | Documentazione e `MANUAL_TEST.md` aggiornati in implementazione |

## Fuori scope

- Redirect retrocompatibilità `/?tab=…`
- Logo grafico (solo testo «Hestia» v1)
- Tab bar su Impostazioni
- Widget o contenuto su `/` oltre al placeholder
- Redesign visivo tab/header oltre quanto serve al refactor
- Link «Vista compatta» da avanzato a standard (opzionale v2)

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| URL sezioni | Route piatte: `/cashflow`, `/notes`, `/evidenza`, `/cashflow/avanzato` |
| Cashflow avanzato mobile | Stessa pagina ovunque (tabella completa) |
| Tab su settings | No |
| Mobile menu | Come oggi, senza Cashflow/Notes |
| Legacy URL | Breaking, no redirect |
| Implementazione layout | Gruppo `(shell)` con layout condiviso tab bar |
| Header Home | Logo + voce Home esplicita |

## Routing

| URL | Tab attiva | Contenuto |
|-----|------------|-----------|
| `/` | Nessuna | «Hestia» centrata |
| `/cashflow` | Cashflow | Standard (`MobileHome`) |
| `/cashflow/avanzato` | Cashflow | Avanzato (`MovementsManager` sempre tabella) |
| `/notes` | Notes | `NotesPage` |
| `/evidenza` | In evidenza | `FeaturedCategoryView` |
| `/settings/*` | — (no tab bar) | Impostazioni esistenti |
| `/dashboard` | — | Redirect → `/` |

### Query param

| Route | Parametri |
|-------|-----------|
| `/cashflow` | `from`, `to` (periodo mese/range) |
| `/cashflow/avanzato` | `from`, `to`, `year` (riepilogo annuale) |
| `/notes`, `/evidenza`, `/` | Nessuno obbligatorio |

## Architettura

### Layout `(protected)/shell/`

```
(protected)/
  layout.tsx          # AppNav (header globale)
  page.tsx            # / — home vuota
  shell/
    layout.tsx        # AppTabBar + children
    cashflow/
      page.tsx        # standard
      avanzato/
        page.tsx      # avanzato
    notes/
      page.tsx
    evidenza/
      page.tsx
  settings/           # fuori shell, no tab bar
```

**Alternativa equivalente:** route group `(tabbed)` con stesso effetto — l’importante è un solo layout per la tab bar.

### Componenti

| Componente | Ruolo |
|------------|--------|
| `AppTabBar` | Evoluzione di `HomeTabs`: link a `/cashflow`, `/notes`, `/evidenza`; active da `usePathname()` |
| `AppNavLinks` / `navItems` | Solo Home + Impostazioni |
| `AppMobileMenu` | Stesse voci ridotte |
| `MobileHome` | Pagina `/cashflow` |
| `MovementsManager` | Pagina `/cashflow/avanzato`; rimuovere branch mobile lista vs tabella |
| `FeaturedCategoryView` | Pagina `/evidenza` |
| `NotesPage` | Pagina `/notes` |

### Eliminare / deprecare

- `lib/home/tab.ts` (+ test)
- `HomeShell`, `HomeNavContext` (se non più usati)
- `app/(protected)/page.tsx` attuale con switch tab
- `buildHomeHref` / `parseHomeTab` e link `/?tab=…`
- Voci Cashflow/Notes da `navItems`

### Middleware e auth

- Mantenere redirect `/dashboard` → `/`
- Post-login → `/` (già così)
- Aggiornare `revalidatePath("/")` dove serve; aggiungere path cashflow/notes/evidenza

## UI copy

- Link footer `/cashflow`: es. **«Vista avanzata»** → `/cashflow/avanzato?from=…&to=…`
- Home `/`: testo **Hestia** (stile heading, centrato)

## Edge case

- Tab già attiva: nessuna azione
- Indietro: `/cashflow` ↔ `/cashflow/avanzato` sono history distinte
- Da Impostazioni a sezione tab: tab bar riappare
- FAB: su `/cashflow` e `/evidenza` (come oggi), non su `/` né avanzato salvo già presente su avanzato

## Test

### Unit

- `AppTabBar` / pathname → tab attiva (incluso `/cashflow/avanzato` → cashflow)
- `isNavItemActive`: Home su `/`, non su `/cashflow`
- Aggiornare test overlay/history se usavano `/?tab=`

### Manuale (`MANUAL_TEST.md`)

- Header: solo Home + Impostazioni (+ account, Esci)
- Hamburger mobile senza Cashflow/Notes
- Tab bar su sezioni, assente in settings
- `/` vuota, nessuna tab selezionata
- `/cashflow` standard + link avanzato
- `/cashflow/avanzato` tabella su mobile
- `/notes`, `/evidenza` con tab corretta
- `/dashboard` → `/`
- `/?tab=notes` **non** redirectato (404 o home senza tab — comportamento accettato breaking)

## Manuale utente

- Navigazione principale = tab sotto l’header
- Home (`/`) = pagina neutra; le sezioni sono Cashflow, Notes, In evidenza
- Cashflow avanzato = link in fondo alla vista standard

## Relazione con design precedenti

| Prima | Dopo |
|-------|------|
| `/?tab=cashflow` | `/cashflow` |
| `/?tab=notes` | `/notes` |
| `/?tab=evidenza` | `/evidenza` |
| Menu Cashflow/Notes | Tab bar |
| `/cashflow` pagina unica desktop/mobile | `/cashflow` standard + `/cashflow/avanzato` |
| Home con contenuto tab | `/` vuota |
