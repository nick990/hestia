# Cashflow — Vista personale (revisione quota famiglia)

**Data:** 2026-06-06  
**Stato:** Approvato  
**Estende:** `2026-06-05-family-share-quota-design.md`  
**Sostituisce parzialmente:** regole di calcolo della spec quota famiglia

## Contesto

Il toggle «Considera solo la mia quota» divideva **tutti** i movimenti famiglia (entrate e uscite) per N membri. Non riflette un bilancio personale realistico: le entrate famiglia altrui (es. stipendio del partner) non fanno parte del proprio cashflow, mentre le uscite condivise sì (a quota).

Decisioni prese in brainstorming:

- Toggle **rinominato** in UI: **«Vista personale»** (URL resta `share=1`).
- Toggle **OFF**: comportamento invariato (importi interi, tutte le entrate famiglia visibili).
- Toggle **ON**: nuove regole per scope, tipo e autore (vedi sotto).
- Logica centralizzata in `lib/cashflow/share.ts` con `currentUserId`.
- Nessuna migration DB.

## Obiettivi

1. Con vista personale attiva, mostrare un cashflow personale coerente.
2. Privati sempre interi.
3. Uscite famiglia sempre ÷ N (indipendentemente dall'autore).
4. Entrate famiglia proprie intere.
5. Entrate famiglia altrui escluse da tabella e totali.
6. Label e testo aiuto aggiornati.

## Regole (toggle ON)

| Movimento | Visibile | Importo |
|-----------|----------|---------|
| `scope=private` (propri) | Sì | Intero |
| `scope=family`, `type=expense` | Sì | `round(amount / memberCount, 2)` |
| `scope=family`, `type=income`, autore = utente corrente | Sì | Intero |
| `scope=family`, `type=income`, autore ≠ utente corrente | **No** | — |

Toggle **OFF**: nessun filtro; importi interi per tutti i movimenti visibili nella vista corrente.

## Requisiti

| ID | Requisito |
|----|-----------|
| R1 | Label checkbox: «Vista personale» |
| R2 | Testo aiuto: «Uscite famiglia divise per {N} membri; entrate famiglia solo le tue; privati interi.» (N dinamico) |
| R3 | Param URL invariato: `share=1` quando ON |
| R4 | Toggle visibile solo se `hasFamily` e `view ∈ {all, family}` |
| R5 | Vista `private`: toggle nascosto; param ignorato |
| R6 | `FamilyShareOptions` include `currentUserId: string` |
| R7 | Esclusione: `family` + `income` + `user_id ≠ currentUserId` quando share attivo |
| R8 | Importo uscita famiglia: ÷ `memberCount` quando share attivo |
| R9 | Importo entrata famiglia propria: intero quando share attivo |
| R10 | Importo privato: intero quando share attivo |
| R11 | Applica filtro + importo in `listMovementsForRange`, `getRangeSummary`, `getYearMonthlySummaries` |
| R12 | Dialog movimento: importo DB reale (invariato) |
| R13 | Navigazione cashflow preserva `share=1` (invariato) |
| R14 | `memberCount` = membri attuali famiglia (invariato) |

## Architettura

### `lib/cashflow/share.ts`

Estendere tipi e funzioni pure:

```ts
export type FamilyShareOptions = {
  shareEnabled: boolean;
  memberCount: number;
  view: CashflowView;
  currentUserId: string;
};

export function isShareActive(view, shareEnabled): boolean;
// invariato: shareEnabled && view !== "private"

export function isIncludedInPersonalView(
  movement: Pick<Movement, "scope" | "type" | "user_id">,
  options: FamilyShareOptions,
): boolean;

export function getEffectiveAmount(
  movement: Pick<Movement, "amount" | "scope" | "type" | "user_id">,
  options: FamilyShareOptions,
): number;

export function applyPersonalViewToMovements(
  movements: Movement[],
  options: FamilyShareOptions,
): Movement[];
```

**`isIncludedInPersonalView`:** se share non attivo → sempre `true`. Se attivo → esclude `family` + `income` + autore ≠ `currentUserId`.

**`getEffectiveAmount`:** se share non attivo → `amount`. Se attivo:
- `private` → `amount`
- `family` + `expense` → `round(amount / memberCount, 2)` (se `memberCount <= 0` → `amount`)
- `family` + `income` → `amount` (righe altrui già filtrate)

**`applyPersonalViewToMovements`:** filtra con `isIncludedInPersonalView`, poi mappa importi con `getEffectiveAmount`.

Rinominare o deprecare `applyShareToMovements` → usa `applyPersonalViewToMovements` internamente o sostituisce export.

### Wiring

- `app/(protected)/cashflow/page.tsx`: `shareOptions = { ..., currentUserId: user.id }`
- `lib/cashflow/queries.ts`: passa `currentUserId` in `resolveShareOptions`; usa `applyPersonalViewToMovements`
- `components/cashflow/view-filter.tsx`: label + testo aiuto

### UI copy

| Elemento | Testo |
|----------|-------|
| Checkbox label | Vista personale |
| Aiuto | Uscite famiglia divise per {N} membri; entrate famiglia solo le tue; privati interi. |

## Comportamenti edge

| Scenario | Comportamento |
|----------|---------------|
| `memberCount = 0` | Nessuna divisione uscite; nessun crash |
| Un solo membro in famiglia | Uscite famiglia = importo pieno (÷ 1) |
| Vista Tutti + share ON | Mix: privati interi + uscite ÷ N + entrate famiglia proprie intere |
| Vista Famiglia + share ON | Solo movimenti family filtrati/trasformati |
| Toggle OFF | Spec quota precedente (importi pieni, nessun filtro entrate) |

## Fuori scope

- Rinomina param URL `share` → `personal`
- Cambio regole con toggle OFF
- Divisione entrate famiglia altrui
- Migration DB

## Test manuali

1. Toggle OFF: importi e righe invariati rispetto a oggi.
2. Toggle ON + uscita famiglia 300 €, N=3 → 100 € in tabella e totali.
3. Toggle ON + entrata famiglia propria 2000 € → 2000 € (non divisa).
4. Toggle ON + entrata famiglia altrui → riga assente; totali senza quella entrata.
5. Toggle ON + privato → importo intero.
6. Label «Vista personale» e testo aiuto corretto.
7. Vista Privati: toggle assente; nessun effetto share.
8. Riepilogo annuale coerente con tabella periodo.

## Riferimenti

- Spec quota (parzialmente superata): `2026-06-05-family-share-quota-design.md`
- Implementazione attuale: `lib/cashflow/share.ts`, `lib/cashflow/queries.ts`
