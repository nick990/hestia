# Design: Saldi e ripartizione spese

**Data:** 2026-09-06  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Estende:** `2026-08-24-movement-assignee-design.md` (chiude il fuori scope «Split expense / chi deve a chi»)  
**Sostituisce:** la frase del manuale Cashflow «Hestia non calcola chi deve soldi a chi» (da aggiornare in implementazione)

## Obiettivo

Aggiungere un secondo strato sopra i movimenti: **chi ha anticipato** un’uscita e **come si spezza** tra i membri della famiglia (stile Tricount). Il Cashflow resta sugli importi veri e sull’assegnatario; i **Saldi** rispondono a «chi deve a chi». I rimborsi chiudono il conto e **non** sono movimenti.

Utenti: coppia o coinquilini, anche più di due persone.

## Nomi

| Superficie | Nome |
|------------|------|
| Tab e pagina | **Saldi** |
| Route | `/saldi` |
| Sezione nel form movimento | **Ripartizione** |
| Toggle che attiva la sezione | **Ripartisci spesa** |
| Azione in pagina Saldi | **Registra rimborso** |
| Lista in pagina Saldi | **Rimborsi** |

Non usare «Pagamento» né «Saldo» sul movimento: un movimento non è un saldo, ci entra.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Tab **Saldi** in barra, tra Cashflow e Notes; visibile solo se l’utente è in una famiglia |
| R2 | Senza famiglia: tab assente; `GET /saldi` redirect a `/` |
| R3 | Sezione **Ripartizione** nel dialog crea/modifica movimento, collassabile, con toggle **Ripartisci spesa** |
| R4 | La sezione compare solo se: utente in famiglia, tipo **uscita**, **non privato** |
| R5 | Toggle spento (default in creazione) = nessuna riga `movement_payments`. In modifica, spegnerlo elimina ripartizione e quote |
| R6 | Toggle acceso = si salva sempre una ripartizione (sempre con quote; non esiste «solo chi ha pagato») |
| R7 | Default da acceso: **chi ha pagato** = assegnatario se `assignee_kind=member`, altrimenti utente loggato; **parti uguali**; **tutti i membri attuali** spuntati |
| R8 | Si può cambiare il pagante (solo membri attuali della famiglia) |
| R9 | Modo divisione: **parti uguali** oppure **per importo** |
| R10 | Si possono spuntare i membri (almeno uno). Il pagante può non essere tra gli spuntati |
| R11 | Parti uguali: quote in centesimi al salvataggio; resto a chi ha pagato se è spuntato, altrimenti al primo membro spuntato nell’ordine della lista form |
| R12 | Per importo: un campo per spuntato; somma quote = importo del movimento (2 decimali) |
| R13 | Un solo spuntato = pagante → netto zero per quella spesa. Un solo spuntato ≠ pagante → l’importo intero è a carico di quella persona |
| R14 | Entrate: sezione assente. Passaggio a entrata in modifica → al salvataggio si elimina l’eventuale ripartizione, senza dialog di conferma |
| R15 | Privato: sezione assente (e non si può spuntare Privato insieme a Ripartisci spesa). Spuntare Privato in modifica → al salvataggio si elimina la ripartizione, senza conferma |
| R16 | Importo movimento vuoto o ≤ 0 → non si salva la ripartizione (toggle acceso non basta) |
| R17 | Cambio importo + parti uguali → quote ricalcolate al salvataggio. Cambio importo + per importo → le quote restano; se la somma non coincide, salvataggio bloccato |
| R18 | Chi può creare/modificare/eliminare il movimento (non privato) può gestire la ripartizione. Stessi permessi famiglia dei movimenti non privati |
| R19 | Lista e totali Cashflow **non** mostrano chi ha pagato, quote, né badge di ripartizione |
| R20 | Pagina Saldi: conto **aperto**, senza filtro periodo |
| R21 | In alto: solo i trasferimenti **semplificati** che coinvolgono l’utente loggato. Testo: «Devi pagare X € a Nome» oppure «Nome ti deve X €». Se non ce n’è nessuno: «Sei in pari» |
| R22 | Sotto: saldo netto di ogni persona coinvolta (positivo = gli devono, negativo = deve). Ordine: utente loggato, altri membri attuali per nome, poi eventuali **usciti** con netto ≠ 0 |
| R23 | Sotto ancora: lista **Rimborsi** («Nome ha rimborsato X € a Nome»), più recenti in cima; si mostra il giorno di `created_at` in piccolo; **elimina**; niente modifica in v1 |
| R24 | **Registra rimborso**: da, a, importo (> 0, da ≠ a), solo membri **attuali**. Default: utente loggato → destinatario del trasferimento semplificato più alto in cui l’utente è debitore; importo precompilato = quel trasferimento. Se non deve niente a nessuno: da = utente loggato, a = altro membro (primo per nome), importo vuoto |
| R25 | I rimborsi **non** sono movimenti: assenti da liste, totali, Sankey, filtri Cashflow |
| R26 | Famiglia con N > 2: stessa pagina e stessa semplificazione (greedy: più in debito con più in credito, centesimo per centesimo) |

## Fuori scope (v1)

- Checkbox «Dividi» distinta dal toggle (un pagamento senza quote)
- Data del pagamento / del rimborso come campo utente
- Modifica rimborso (solo elimina e ricrea)
- Filtro mese/periodo sui Saldi
- Rimborso verso o da chi non è più in famiglia
- Badge o colonne ripartizione in Cashflow
- Realtime
- Azzeramento forzato all’uscita dalla famiglia
- Multi-valuta, allegati, movimenti ricorrenti

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Nome pagina/tab | **Saldi** |
| Nome form | **Ripartizione** / toggle **Ripartisci spesa** |
| Rimborsi | Dalla pagina Saldi, lista dedicata, mai Cashflow |
| Quali movimenti | Solo uscite, famiglia o personali, se sei in famiglia |
| Privati | Niente ripartizione |
| Periodo Saldi | Tutto il conto aperto |
| Trasferimenti in alto | Solo quelli che ti riguardano, dopo semplificazione |
| «Dividi spento» | Rimosso: ripartizione = sempre quote |
| Attivazione | Toggle esplicito, non il solo aprire la sezione |
| Modello dati | Tabelle normalizzate, non JSON né libro mastro di eventi |
| Indicatore in lista Cashflow | No |

## Modello dati

### `movement_payments`

Un pagamento per movimento, solo se il toggle è acceso.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | uuid PK | `gen_random_uuid()` |
| `movement_id` | uuid NOT NULL UNIQUE | FK `movements(id)` ON DELETE CASCADE |
| `family_id` | uuid NOT NULL | FK `families(id)` ON DELETE CASCADE |
| `payer_user_id` | uuid NOT NULL | FK `auth.users(id)` ON DELETE RESTRICT |
| `split_mode` | text NOT NULL | `equal` \| `amount` |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()`; trigger su update |

**Vincoli applicativi (action + CHECK dove possibile)**

- Il movimento è `type = expense` e `is_private = false`
- `payer_user_id` è (o era) membro della famiglia; in **scrittura** deve essere membro **attuale**
- Esiste almeno una riga in `movement_payment_shares` per questo pagamento

### `movement_payment_shares`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | uuid PK | |
| `payment_id` | uuid NOT NULL | FK `movement_payments(id)` ON DELETE CASCADE |
| `user_id` | uuid NOT NULL | FK `auth.users(id)` ON DELETE RESTRICT |
| `amount` | numeric(12,2) NOT NULL | Quota > 0 |
| UNIQUE (`payment_id`, `user_id`) | | |

Somma delle `amount` = `movements.amount` del movimento collegato (validato in action; trigger opzionale).

Le quote si **materializzano** al salvataggio. Non si ricalcolano in lettura se cambia il numero di membri.

### `reimbursements`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | uuid PK | |
| `family_id` | uuid NOT NULL | FK `families(id)` ON DELETE CASCADE |
| `from_user_id` | uuid NOT NULL | Chi ha dato i soldi; FK `auth.users` ON DELETE RESTRICT |
| `to_user_id` | uuid NOT NULL | Chi li ha ricevuti; FK `auth.users` ON DELETE RESTRICT |
| `amount` | numeric(12,2) NOT NULL | > 0 |
| `created_by` | uuid NOT NULL | FK `auth.users` |
| `created_at` | timestamptz | default `now()`; unica «data» (read-only in UI) |

CHECK: `from_user_id <> to_user_id`.

Niente `occurred_on`. Niente FK verso `movements`.

## Calcolo saldi

Soglia zero: `|importo| < 0,01` € si tratta come zero.

**Segno netto:** positivo = gli devono; negativo = deve.

Per ogni `movement_payments` con le sue quote, sia `A` l’importo del movimento:

1. `net[payer] += A`
2. Per ogni share: `net[user] -= share.amount`

Per ogni rimborso:

1. `net[from_user] += amount`
2. `net[to_user] -= amount`

Esempio uscita 90 € pagata da Nic, tre quote da 30: Nic +60, Sara −30, Marco −30.

Esempio rimborso Sara → Nic 40 €: Sara +40, Nic −40.

**Semplificazione (greedy):** finché esistono un creditore (`net ≥ 0,01`) e un debitore (`net ≤ −0,01`), abbina il creditore con netto più alto e il debitore con netto più basso (più negativo); importo = `min(credito, −debito)`; emetti «debitore paga creditore»; riduci i due netti.

In pagina, dall’elenco semplificato, **filtra** le righe in cui `from` o `to` è l’utente loggato. Non mostrare i trasferimenti solo tra terzi. «Sei in pari» significa che **tu** non hai trasferimenti suggeriti; altri membri possono avere netti non zero tra loro.

## RLS

Allineata ai movimenti **non privati** di famiglia: qualsiasi membro attuale della `family_id` può SELECT/INSERT/UPDATE/DELETE su pagamenti, quote e rimborsi di quella famiglia. Niente accesso anonimo.

Le policy non devono esporre movimenti privati: una ripartizione su privato è impedita in scrittura (R15); in lettura le quote restano visibili ai membri perché il movimento non è privato.

`family_id` sul pagamento deve coincidere con la famiglia di chi scrive e con i membri pagante/quote (validazione in action).

## Architettura applicazione

```
lib/saldi/split.ts          — parti uguali + resto (puro, testabile)
lib/saldi/balances.ts       — netti + semplificazione + filtro «che ti riguardano»
app/actions/movements.ts    — create/update accettano payload ripartizione opzionale; delete cascade DB
app/actions/reimbursements.ts — create + delete
app/(protected)/(tabbed)/saldi/page.tsx
components/saldi/           — lista trasferimenti, netti, rimborsi, dialog rimborso
components/cashflow/movement-form-dialog.tsx — sezione Ripartizione
lib/nav/tab-bar.ts          — tab `saldi`
```

Query Saldi: tutti i pagamenti+quote+rimborsi della `family_id` (nessun filtro data). Calcolo in TypeScript, non una vista SQL in v1.

### Payload ripartizione (create/update movimento)

```ts
type SplitMode = "equal" | "amount";

type MovementSplitInput =
  | { enabled: false }
  | {
      enabled: true;
      payerUserId: string;
      splitMode: SplitMode;
      shares: { userId: string; amount?: number }[];
    };
```

Con `enabled: true` e `splitMode: "equal"`, le `amount` si ignorano e si ricalcolano dal movimento. Con `"amount"` sono obbligatorie e devono sommare all’importo.

## UI

### Form movimento

Header sezione: titolo **Ripartizione**, toggle **Ripartisci spesa**. Spento: corpo nascosto. Acceso: si apre.

Campi visibili da acceso: **Chi ha pagato** (select membri), scelta **Parti uguali** / **Per importo**, checkbox membri con quota accanto al nome (calcolata in live se uguali; input se per importo).

Se l’utente passa a entrata o Privato, la sezione sparisce e lo stato interno del toggle diventa spento (il save persiste l’eliminazione).

### Pagina Saldi

1. Trasferimenti che ti riguardano (o «Sei in pari»)
2. Netti per persona
3. Pulsante **Registra rimborso**
4. Lista **Rimborsi** con elimina (conferma come i movimenti)

Copy in italiano, tono domestico (`PRODUCT.md`). Importi con lo stesso format Cashflow.

## Errori

- Somma quote ≠ importo: toast, si resta nel dialog movimento
- Ripartizione accesa senza membri o senza pagante valido: blocco salvataggio
- Rimborso da = a o importo ≤ 0: blocco nel dialog rimborso
- Messaggi in italiano

Niente conferma extra per la perdita di ripartizione quando si spunta Privato o si passa a entrata: la sezione è già scomparsa.

## Test

Vitest su funzioni pure (stesso stile di `lib/cashflow/*.test.ts`):

- 2 persone, split uguale, Nic paga
- 3 persone, 90 €, resto 0; 100 € / 3 con resto al pagante
- Pagante non tra gli spuntati
- Un solo spuntato = pagante → netti invariati
- Rimborso che azzera
- Semplificazione: Nic +50, Sara −20, Marco −30 → due trasferimenti verso Nic; loggato come Sara vede solo «Devi pagare 20 € a Nic»
- Membro uscito con netto ≠ 0 compare nell’elenco netti
- `resolveAppTab('/saldi') === 'saldi'`

`MANUAL_TEST.md`: crea uscita con Ripartisci spesa, verifica Saldi, registra rimborso, verifica assenza in Cashflow, elimina rimborso, spegni toggle e verifica saldi.

## Documentazione (in implementazione, non in questo file)

- Nuovo `docs/manuale/saldi.md`
- Aggiornare `docs/manuale/index.md`, `docs/manuale/cashflow.md`, `PRODUCT.md` (riga tab)
- Aggiornare `docs/MANUAL_TEST.md`

## Criteri di accettazione

1. Coppia: uscita famiglia 80 €, Nic paga, parti uguali, entrambi spuntati → Nic +40, Sara −40; loggato come Nic vede «Sara ti deve 40 €».
2. Rimborso Sara 40 € a Nic → entrambi a zero; riga in Rimborsi; Cashflow invariato.
3. Tre membri: i trasferimenti in alto per Nic non includono una riga solo Sara↔Marco.
4. Uscita privata: niente sezione Ripartizione.
5. Senza famiglia: niente tab Saldi.
6. Toggle spento in modifica di un movimento che aveva ripartizione → saldi aggiornati come se quella spesa non fosse mai stata ripartita.
