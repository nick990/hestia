# Design: summary Saldi calcolato lato server

**Data:** 2026-11-09  
**Stato:** implementato  
**Progetto:** Hestia (Next.js, Supabase)  
**Estende:** `2026-09-06-saldi-ripartizione-design.md` (R20–R22, modello dati invariato)  
**Non sostituisce:** lista attività paginata (`2026-09-06-saldi-activity-feed-design.md`)

## Obiettivo

Scala della pagina **Saldi** nel lungo periodo (migliaia di ripartizioni/rimborsi): evitare di inviare l’intera storia al browser solo per calcolare netti e trasferimenti. Il calcolo resta **derived on read** (nessuna tabella saldi materializzata), ma avviene **sul server** prima del render; il client riceve solo il summary già pronto.

Semantica invariata rispetto a `lib/saldi/balances.ts` e `listFamilyNets()` odierno.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | `listFamilyNets()` (o successor) legge da DB come oggi: `movement_payments` + quote + `reimbursements` della famiglia, con le stesse esclusioni (`family` payer, non uscita, privato) |
| R2 | Sul server: `computeNets` → `simplifyTransfers`; costruzione elenco `PersonNet` con `sortPersonNets` (serve `currentUserId`) |
| R3 | Il payload verso `SaldiPage` **non** include più array grezzi `expenses` / `reimbursements` |
| R4 | Il client **non** invoca `computeNets` né `simplifyTransfers` sul summary |
| R5 | Dopo rimborso o movimento con ripartizione: flusso invariato (`revalidate` + `router.refresh()`); il server ricalcola il summary al refresh |
| R6 | Lista attività: `listSaldiActivity` paginata, invariata |
| R7 | Ex-membri con netto ≠ 0: stessa logica di oggi (nomi da `nameById` caricato come ora) |
| R8 | Default rimborso (`defaultReimbursement`): basato sui trasferimenti che coinvolgono l’utente, come oggi |

## Fuori scope

- Saldi materializzati in DB (delta a ogni scrittura)
- Aggregazione SQL / materialized view (possibile fase 2 se il profiling lo richiede)
- Summary restituito dalla server action senza `router.refresh()`
- Realtime, notifiche «sei in debito»
- Cambio UX copy o presentazione (transfer line, resoconto 3+ membri)

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Fonte di verità saldi | Eventi in DB (ripartizioni + rimborsi); nessuna nuova tabella |
| Dove si calcola | Server (route `/saldi` o modulo `lib/saldi/queries`) |
| Dove si semplifica | Server (`simplifyTransfers`); membri famiglia pochi |
| Client | Presentation: `transfersForUser`, `defaultReimbursement`, UI |
| Migrazione DB | Nessuna |

## Architettura

### Tipi (`lib/saldi/types.ts`)

Sostituire / affiancare `FamilySaldiNetsData` con un tipo summary, es.:

```ts
export type FamilySaldiSummary = {
  familyId: string;
  currentMembers: FamilySaldiMember[];
  nameById: Record<string, string>;
  /** Netti grezzi per utente (inclusi ex-membri con valore ≠ 0). */
  netsByUserId: Record<string, number>;
  /** Trasferimenti semplificati su tutta la famiglia. */
  transfers: Transfer[];
  /** Risultato di sortPersonNets, già pronto per UI resoconto. */
  personNets: PersonNet[];
};
```

`PersonNet` e `Transfer` restano quelli esistenti.

Alternativa valida: passare solo `netsByUserId` + `transfers` e lasciare `sortPersonNets` sul client (pochi membri). **Preferenza spec:** `personNets` calcolato sul server per tenere il client magro.

### Query (`lib/saldi/queries.ts`)

- Estrarre il caricamento righe DB in una funzione interna (es. `loadFamilySaldiSourceRows`) se utile ai test.
- `listFamilySaldiSummary(currentUserId: string): Promise<FamilySaldiSummary | null>`:
  1. Carica famiglia / membri / pagamenti / rimborsi (stesso codice odierno di mapping in `expenses` + `reimbursements`).
  2. `computeNets(expenses, reimbursements)`.
  3. `simplifyTransfers(nets)`.
  4. Costruisce `personNets` con `sortPersonNets(..., currentUserId)`.
  5. Serializza `nets` in `netsByUserId`.
- Deprecare l’export pubblico del payload grezzo; aggiornare unico consumer (`app/(protected)/(tabbed)/saldi/page.tsx`).

### Route (`saldi/page.tsx`)

Passa `currentUserId` al loader. Props: `summary: FamilySaldiSummary` invece di `data: FamilySaldiNetsData`.

### Client (`components/saldi/saldi-page.tsx`)

- Rimuovere `useMemo` che chiama `computeNets` / `simplifyTransfers` / `sortPersonNets` su dati grezzi.
- Derivare `mine` con `transfersForUser(summary.transfers, currentUserId)`.
- `defaults` con `defaultReimbursement(mine, ...)`.
- Resoconto: `summary.personNets` (o ricalcolo leggero da `netsByUserId` se si taglia `personNets`).

### Scrittura (rimborso / movimento)

| Evento | DB | UI |
|--------|-----|-----|
| `createReimbursement` | insert `reimbursements` | toast → `refreshLists()` |
| `updateReimbursement` / delete | update/delete | idem |
| Movimento + ripartizione | `persistSplitForMovement` | `router.refresh()` da form |

Nessuna modifica alle action: al refresh la route richiama il loader che riscansiona la storia **solo sul server**.

## Error handling

- Errori query: come oggi (`throw` / redirect se no famiglia).
- Famiglia senza eventi saldi: netti a zero, «Sei in pari», lista attività vuota o paginata.

## Test

| Caso | Tipo | Atteso |
|------|------|--------|
| Fixture spese + rimborsi → summary | Unit su loader (mock righe o fixture typed) | Stesso risultato di `computeNets` + `simplifyTransfers` + `sortPersonNets` applicati in test |
| Regressione `balances.test.ts` | Esistente | Invariato |
| `transfersForUser` / `defaultReimbursement` | Esistente | Invariato |
| Nessun import di `FamilySaldiNetsData` grezzo nel client | Grep / types | Solo `FamilySaldiSummary` |

TDD suggerito: scrivere prima il test del loader con fixture copiate da `balances.test.ts`, poi refactor `listFamilyNets`.

## Implementazione (ordine suggerito)

1. Aggiungere tipo `FamilySaldiSummary` e test loader.
2. Implementare `listFamilySaldiSummary`.
3. Aggiornare route e `SaldiPage`.
4. Rimuovere tipo/export `FamilySaldiNetsData` se non più usato.
5. Aggiornare `docs/manuale/saldi.md` una riga: i netti sono calcolati al caricamento server (comportamento utente invariato).

## Riferimenti codice

- `lib/saldi/balances.ts` — calcolo netti e semplificazione
- `lib/saldi/queries.ts` — `listFamilyNets` attuale
- `components/saldi/saldi-page.tsx` — `useMemo` da eliminare
