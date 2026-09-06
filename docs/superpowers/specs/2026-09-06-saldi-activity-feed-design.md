# Design: lista attività Saldi (scroll infinito, modifica rimborso)

**Data:** 2026-09-06  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia (Next.js 16, Supabase, shadcn/ui)  
**Estende:** `2026-09-06-saldi-ripartizione-design.md`  
**Sostituisce:** R23 (lista Rimborsi dedicata, solo elimina); fuori scope «data rimborso» e «modifica rimborso»; le due liste titolate Ripartizioni/Rimborsi introdotte in implementazione

## Obiettivo

Sulla pagina Saldi, una **sola lista** mescola ripartizioni e rimborsi. I primi 20, poi scroll infinito. Click su una ripartizione apre la form movimento; click su un rimborso apre il dialog per modificarlo (inclusa la data). I **netti** restano il conto aperto e non dipendono da quanta lista hai caricato.

## Requisiti funzionali

| ID | Requisito |
|----|-----------|
| R1 | Netti e trasferimenti in alto: invariati (conto aperto, semplificati, «Sei in pari»). Calcolati da **tutte** le ripartizioni e **tutti** i rimborsi, non dalla pagina visibile |
| R2 | Query netti: solo numeri (pagante, importo movimento, quote, da/a/importo rimborso). Niente categoria, descrizione, testo lista |
| R3 | Sotto netti + **Registra rimborso**: **una** lista senza titoli di sezione |
| R4 | Riga ripartizione: categoria, descrizione se c’è, `occurred_on` del movimento, importo, «Pagato da …». Tutta la riga apre `MovementFormDialog` in modifica |
| R5 | Riga rimborso: «Nome ha rimborsato X € a Nome», data `occurred_on`. Tutta la riga apre il dialog rimborso in modifica |
| R6 | Lista: primi **20**, ordinati per `occurred_on` desc, tie-break `created_at` desc, poi id. In fondo, sentinella visibile → altri 20. Fine dati: nessun fetch ulteriore |
| R7 | Offset/limit v1 (`offset = page * 20`). Famiglie piccole; niente cursore keyset in v1 |
| R8 | `reimbursements.occurred_on` `date NOT NULL`. Default creazione: oggi. In modifica, campo Data. Backfill: giorno di `created_at` |
| R9 | `created_at` immutabile. I netti ignorano le date |
| R10 | Update rimborso: da, a, importo, `occurred_on`; stesse validazioni della create (da ≠ a, importo > 0, membri attuali, data `YYYY-MM-DD`) |
| R11 | Elimina rimborso: nel dialog modifica, conferma come i movimenti. Niente Elimina in lista |
| R12 | Dopo create/update/delete movimento o rimborso: ricalcolo netti; lista riparte dai primi 20 |
| R13 | Carica-altri in errore: toast italiano; un nuovo ingresso in vista della sentinella ritenta |
| R14 | Lista vuota: nessun placeholder di riga; restano netti e **Registra rimborso** |
| R15 | Saldi monta `MovementFormDialog` (membri, categorie, utente). Serve il movimento completo per id se non è già in memoria |
| R16 | Ripartizione orfana (movimento sparito): riga assente dalla lista; i netti la ignorano se il join fallisce |
| R17 | «Pagato da …» in Cashflow (già in lista sotto l’importo) resta; non fa parte di questo lavoro se già presente |

## Fuori scope

- Filtro periodo / ricerca sulla lista
- Scroll infinito sui netti
- Keyset cursor
- Rimborso verso chi è uscito dalla famiglia
- Materializzare i netti in tabella
- Realtime

## Decisioni (brainstorming)

| Tema | Decisione |
|------|-----------|
| Paginazione UI | Scroll infinito, N=20, «Mostra altri» scartato |
| Scalabilità | Due query: netti compatti vs attività paginata |
| Liste | Unica, senza titoli Ripartizioni/Rimborsi |
| Click ripartizione | Form modifica movimento |
| Click rimborso | Dialog modifica (non solo elimina) |
| Data rimborso | Campo `occurred_on`, creazione e modifica |
| Tie-break stesso giorno | `created_at` desc |

## Modello dati

### `reimbursements`

| Colonna | Tipo | Note |
|---------|------|------|
| `occurred_on` | date NOT NULL | Giorno scelto dall’utente; backfill da `created_at::date` |

Indice: `(family_id, occurred_on desc, created_at desc)` per la lista.

`created_at` invariato.

## Architettura

```
listFamilyNets()           — pagamenti (payer, amount, shares) + rimborsi (from, to, amount)
listSaldiActivity(offset)  — union/merge 20 righe display
getMovementById(id)        — per aprire il dialog se serve
updateReimbursement(...)   — da, a, amount, occurredOn
```

Merge in TypeScript, non `union` SQL in v1. Per `offset` e `limit` (20): da ciascuna fonte leggi le prime `offset + limit + 1` righe già ordinate; unisci; ordina; `slice(offset, offset + limit)`. `hasMore` = la merge ha più di `offset + limit` elementi. Qualsiasi riga nel top globale k è tra le prime k della sua fonte, quindi non si perdono righe.

Tipo riga attività:

```ts
type SaldiActivityItem =
  | {
      kind: "split";
      id: string; // movement_id
      occurredOn: string;
      createdAt: string;
      amount: number;
      categoryName: string | null;
      description: string;
      payerName: string;
    }
  | {
      kind: "reimbursement";
      id: string;
      occurredOn: string;
      createdAt: string;
      amount: number;
      fromUserId: string;
      toUserId: string;
    };
```

`hasMore`: `true` se esiste almeno una riga oltre `offset + 20`.

## UI

Ordine pagina: trasferimenti tuoi → netti → **Registra rimborso** → lista unica.

Ripartizione: layout come Cashflow (categoria / descrizione / data | importo + «Pagato da»).  
Rimborso: testo + data a sinistra; niente bottone Elimina in riga.

Dialog rimborso: Data, Chi ha dato, Chi ha ricevuto, Importo. In modifica: titolo «Modifica rimborso», footer Elimina + Salva. In creazione: Data=oggi, default da/a/importo come R24 della spec padre.

Sentinella: elemento in fondo con `IntersectionObserver`; se `hasMore` e non in pending, incrementa offset.

## Errori

- Update/create rimborso: stessi toast della create attuale + «Data non valida.»
- Fetch pagina: «Non riesco a caricare altre righe.»
- Movimento non trovato al click: toast, lista invariata

## Test

- Merge: ripartizione 6/9 e rimborso 6/9 → rimborso prima se `created_at` più recente
- Prima pagina length 20; seconda senza id duplicati
- `hasMore` false sull’ultima pagina
- `computeNets` invariato se si passano tutti i numeri e la lista è un sottoinsieme
- `occurred_on` backfill / parse data
- Default dialog create vs edit

`MANUAL_TEST.md` e `docs/manuale/saldi.md`: lista unica, scroll, click, data rimborso.

## Criteri di accettazione

1. Pagina con 25 ripartizioni: se ne vedono 20; scroll → le altre 5; netti uguali a prima dello scroll.
2. Click ripartizione → form movimento con Ripartisci spesa acceso.
3. Click rimborso → dialog con data/da/a/importo; cambio data sposta la riga; i netti cambiano solo se da/a/importo cambiano.
4. Nessun heading «Ripartizioni» o «Rimborsi».
