# Design: messaggio Saldi e resoconto netti

**Data:** 2026-09-07  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Estende:** `2026-09-06-saldi-ripartizione-design.md` (R21, R22)  
**Sostituisce:** resoconto netti sempre visibile; messaggio principale senza colore sull’importo

## Obiettivo

Rendere più leggibile la testata della pagina **Saldi**: l’importo nel messaggio che riguarda l’utente loggato usa rosso se deve pagare e verde se gli devono; in famiglie da **due** persone il resoconto per persona sotto il messaggio non serve e va nascosto.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Messaggio debitore (utente = `fromUserId` del trasferimento semplificato): «Devi pagare **X €** a Nome» — solo **X €** in rosso (`text-destructive`) |
| R2 | Messaggio creditore (utente = `toUserId`): «Nome ti deve **X €**» — solo **X €** in verde (`text-income`) |
| R3 | Copy invariato rispetto a oggi; nessuna forma «Devi ricevere … da …» |
| R4 | Resto del testo (prefisso, nome, congiunzioni) in colore ink normale |
| R5 | Importo con `tabular-nums`, come altrove nell’app |
| R6 | Più trasferimenti che coinvolgono l’utente: una riga ciascuno, colore indipendente per riga |
| R7 | «Sei in pari» (nessun trasferimento): testo normale, nessun importo colorato |
| R8 | Resoconto netti per persona (Nic +567 / Sarix −567): **nascosto** se `currentMembers.length < 3` |
| R9 | Resoconto netti: **visibile** se `currentMembers.length ≥ 3`; copy, ordine e formattazione importi invariati (senza colori sui netti in questa iterazione) |
| R10 | Pulsante **Registra rimborso**, lista attività e nota in fondo: invariati |

## Fuori scope

- Colori sui netti nel resoconto multi-persona
- Cambio copy («Devi ricevere …»)
- Logica semplificazione trasferimenti o calcolo netti
- Famiglie con membri usciti ma `currentMembers.length === 2`: stessa regola R8 (resoconto nascosto)

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Copy creditore | Tenere «Nome ti deve X €» (opzione A) |
| Cosa colorare | Solo l’importo, non l’intera frase |
| Soglia resoconto | Contare solo **membri attuali** (`currentMembers`); da 3 in su si mostra |
| Implementazione | `transferLineParts()` + componente `TransferLine`; `transferLine()` stringa resta per test/regressione |

## Architettura

### `lib/saldi/presentation.ts`

Nuovo tipo e funzione:

```ts
type TransferLineTone = "debit" | "credit";

type TransferLineParts = {
  before: string;
  amount: string; // già formattato con formatEuro
  after: string;
  tone: TransferLineTone;
};

function transferLineParts(
  transfer: Transfer,
  currentUserId: string,
  nameById: Map<string, string>,
): TransferLineParts;
```

- Debitore: `{ before: "Devi pagare ", amount, after: " a Nome", tone: "debit" }`
- Creditore: `{ before: "Nome ti deve ", amount, after: "", tone: "credit" }`

`transferLine()` continua a concatenare i segmenti (comportamento identico a oggi).

### `components/saldi/transfer-line.tsx`

Componente presentazionale:

- Renderizza `before` + `<span className={tone === "debit" ? "text-destructive" : "text-income"} tabular-nums">{amount}</span>` + `after`
- Wrapper: `text-base` (come la `<li>` attuale)

### `components/saldi/saldi-page.tsx`

- Sostituire `{transferLine(...)}` con `<TransferLine transfer={...} ... />`
- Avvolgere la sezione resoconto netti in `{data.currentMembers.length >= 3 ? ( ... ) : null}`

### Manuale

`docs/manuale/saldi.md`: aggiornare «Cosa vedi» — resoconto per persona solo da tre membri in su; importo colorato nel messaggio principale.

## Test

| Caso | Atteso |
|------|--------|
| `transferLineParts`, debitore | `tone: "debit"`, segmenti corretti |
| `transferLineParts`, creditore | `tone: "credit"`, segmenti corretti |
| `transferLine` | invariato (regressione su test esistenti) |
| Concatenazione parts | uguale a output `transferLine` |

Test UI/resoconto nascosto: opzionale via logica pura (`showPersonNets = members.length >= 3`); nessun test E2E richiesto.

## Riferimenti visivi

Token da `DESIGN.md`: `--destructive` / `text-destructive` per uscite e debito; `--income` / `text-income` per credito. Coerente con `period-summary-cards` e `movement-list-row`.
