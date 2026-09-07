# Design: pagante sempre e ripartizione implicita

**Data:** 2026-09-07  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Estende:** `2026-09-06-saldi-ripartizione-design.md`, `2026-09-06-saldi-activity-feed-design.md`  
**Sostituisce:** R5, R6, R7, R19 della spec padre Saldi; manuale `saldi.md` sezione Ripartisci spesa; comportamento «Ripartisci spento = nessuna riga DB»

## Obiettivo

Ogni **uscita non privata** (utente in famiglia) ha sempre **chi ha pagato**, visibile e persistito. La spunta **Ripartisci spesa** serve solo a **modificare** la divisione e coinvolgere più persone; con spunta spenta la spesa è comunque ripartita al **100% sul pagante** (materializzata in DB). **Famiglia** come pagante indica conto di casa: fuori dai Saldi, spunta disabilitata.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Sezione **Ripartizione** su uscite non private (in famiglia): sempre visibile; **Chi ha pagato** sempre editabile in cima |
| R2 | **Chi ha pagato**: select con tutti i membri attuali + voce **Famiglia** |
| R3 | Default pagante in creazione: assegnatario se `assignee_kind=member`; **Famiglia** se `assignee_kind=family` |
| R4 | In **creazione**, se l’utente non ha toccato pagante né ripartizione (`payerTouched` / `splitTouched` false), cambio assegnatario aggiorna il pagante: membro → quel membro; di famiglia → Famiglia |
| R5 | In **modifica**: pagante e ripartizione **non** si aggiornano mai da soli al cambio assegnatario |
| R6 | `payerTouched` = l’utente ha cambiato il select pagante. `splitTouched` = ha acceso/spento la spunta o modificato quote/modalità/spunte |
| R7 | Toggle **Ripartisci spesa**: accende i controlli sotto (parti uguali / per importo, spunte). Spento = controlli **disabilitati** (non nascosti) |
| R8 | Pagante **Famiglia** (`payer_kind=family`): toggle ripartizione **disabilitato e spento**; nessuna quota; movimento **escluso** dai netti Saldi |
| R9 | Pagante **membro**, spunta spenta: al salvataggio una quota al **100%** del pagante; netto Saldi zero per quella spesa |
| R10 | Pagante **membro**, spunta accesa: stesse regole della spec padre (parti uguali / per importo, almeno uno spuntato, pagante può non essere spuntato, validazioni somma) |
| R11 | Passaggio pagante da membro a **Famiglia**: spegni toggle, azzera stato ripartizione custom |
| R12 | Passaggio pagante da **Famiglia** a membro: toggle di nuovo abilitato (spento); implicito 100% sul nuovo pagante al salvataggio se spunta resta spenta |
| R13 | **Entrate**: sezione assente; al salvataggio **elimina** `movement_payments` e quote se presenti |
| R14 | **Privati**: sezione assente; al salvataggio **elimina** pagamento se presente; **nessuna** riga nuova |
| R15 | Importo ≤ 0 o vuoto: non salvare pagamento (come oggi per ripartizione) |
| R16 | Cashflow lista: sotto l’importo, uscite non private con pagamento — «Pagato da Nome» se membro, «Pagato da Famiglia» se `payer_kind=family` |
| R17 | Netti Saldi: includono pagamenti `payer_kind=member` con quote; **ignorano** `payer_kind=family` |
| R18 | Lista attività Saldi: filtro attuale invariato (≥2 persone distinte coinvolte + utente loggato). Ripartizione 100% solo pagante resta fuori lista |
| R19 | Nota in fondo lista Saldi: «In lista compaiono solo i movimenti tra almeno due persone in cui sei coinvolto.» (testo già presente; invariato) |
| R20 | **Backfill** migrazione: uscite non private, creatore in famiglia, senza `movement_payments` — assegnatario membro → pagante + quota 100%; assegnatario di famiglia → `payer_kind=family` senza quote. **Non** backfillare privati né entrate. **Non** toccare righe già esistenti |
| R21 | Permessi: invariati (stessi del movimento non privato) |

## Fuori scope

- Pagante / quote su **entrate**
- Pagante / quote su uscite **private**
- Pagante su movimenti senza famiglia
- Modifica regole rimborsi o activity feed oltre a quanto in R17–R19
- Realtime, multi-valuta

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Persistenza | Approccio 1: sempre materializzato al salvataggio (non default solo in UI) |
| Spunta spenta | 1 quota 100% pagante in DB |
| Famiglia pagante | Conto di famiglia; no Saldi; no ripartizione |
| Spunta accesa | Ripartizione custom (spec padre R9–R12) |
| Sync pagante←assegnatario | Solo creazione, se non touched |
| Backfill | Sì, regole = default form; privati esclusi |
| Solo uscite | Sì |

## Modello dati

### `movement_payments` (alter)

| Colonna | Tipo | Note |
|---------|------|------|
| `payer_kind` | text NOT NULL DEFAULT `'member'` | `'member'` \| `'family'` |
| `payer_user_id` | uuid NULL | FK `auth.users`; NULL se `payer_kind=family` |

Vincoli:

- `payer_kind = 'member'` ⇒ `payer_user_id` NOT NULL
- `payer_kind = 'family'` ⇒ `payer_user_id` NULL
- Check su `payer_kind`

`split_mode` resta obbligatorio; per 100% implicito usare `'equal'`.

### Backfill SQL (linee guida)

Per ogni movimento `expense`, `is_private = false`, senza riga in `movement_payments`, il cui `created_by` è in `family_members`:

1. `family_id` dalla membership del creatore
2. Se `assignee_kind = 'member'`: insert payment `payer_kind=member`, `payer_user_id=assignee_user_id`, `split_mode=equal`; insert share 100% importo su `assignee_user_id`
3. Se `assignee_kind = 'family'`: insert payment `payer_kind=family`, `payer_user_id=NULL`; nessuna share

Skip se creatore non in famiglia o movimento già ha payment.

## Architettura

```
resolveSplitPersistence()  — sempre upsert (member/family) o delete (privato/entrata/no family)
persistSplitForMovement()  — payer_kind, nullable payer_user_id
MovementFormDialog           — Chi ha pagato sempre; splitTouched / payerTouched in creazione
loadMovementSplit()          — payer_kind + shares; infer splitEnabled da count quote > 1 OR quote unica ≠ solo pagante OR split_mode amount con più quote
listFamilyNets()             — skip payer_kind=family
listSaldiActivity()          — invariato (filtro ≥2 persone)
Cashflow queries             — Pagato da Famiglia / Nome da payer_kind
```

**`splitEnabled` in modifica:** acceso se esiste ripartizione **custom** — almeno due persone distinte tra pagante e spuntati, oppure una quota non corrisponde al default 100% pagante (es. parti uguali tra più membri). Spento se unica quota 100% pagante o equivalente.

In creazione: toggle spento; pagante e implicito 100% al salvataggio.

## UI form

Ordine sezione Ripartizione:

1. **Chi ha pagato** (select membri + Famiglia)
2. Riga con label **Ripartizione** + toggle **Ripartisci spesa**
3. `MovementSplitFields` — abilitati solo se toggle ON e pagante ≠ Famiglia

Mutua esclusione **Privato** / **Ripartisci spesa** invariata (privato disabilita ripartizione).

## Errori

- Pagante membro non in famiglia: «Chi ha pagato non è valido.»
- Spunta accesa, zero spuntati: «Ripartisci spesa richiede almeno un membro.»
- Somma quote ≠ importo (per importo): messaggio esistente
- Salvataggio con Famiglia pagante e toggle ON impossibile in UI (toggle disabilitato)

## Test

- `resolveSplitPersistence`: membro spunta off → 1 share 100%; family → upsert senza shares; privato/entrata → delete
- `isSplitVisibleInActivity` / netti: family payer escluso; 100% pagante → netto 0
- Form creazione: assignee change sync pagante se non touched; no sync dopo touch o in edit
- Famiglia pagante: toggle disabled
- Backfill migration: campione membro / famiglia / skip privato / skip existing
- Cashflow: «Pagato da Famiglia» vs nome membro

Aggiornare `docs/manuale/saldi.md`, `docs/manuale/cashflow.md`, `docs/MANUAL_TEST.md`.

## Criteri di accettazione

1. Nuova uscita di famiglia: compare **Chi ha pagato**; salvataggio senza accendere spunta → riga DB + quota 100% pagante; Cashflow mostra pagante.
2. Assegnatario di famiglia in creazione: default pagante Famiglia; toggle ripartizione disabilitato; netti invariati.
3. Accendi spunta, riparti tra due: netti e lista Saldi (se coinvolgi ≥2) coerenti con spec padre.
4. Modifica uscita esistente: cambio assegnatario **non** muove pagante.
5. Backfill: uscita storica senza payment → dopo migrazione ha pagante secondo regole; ripartizioni custom preesistenti intatte.
6. Privato / entrata: nessun payment; passaggio da uscita ripartita elimina payment.
