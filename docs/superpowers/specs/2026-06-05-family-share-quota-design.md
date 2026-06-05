# Cashflow — quota famiglia (divisione per membri)

**Data:** 2026-06-05  
**Stato:** Approvato

## Contesto

Il cashflow espone una vista segmentata **Tutti / Famiglia / Solo miei** (`view`). I movimenti `scope=family` mostrano l'importo intero condiviso dalla famiglia. L'utente vuole opzionalmente vedere **solo la propria quota** di tali movimenti, calcolata dividendo per il numero di membri attuali della famiglia.

Decisioni prese in brainstorming:

- Divisione su **tutti** i movimenti famiglia (entrate e uscite), non solo uscite.
- Conteggio membri: **attuale** (non storico al momento del movimento).
- In tabella e riepiloghi: **solo importo già diviso** (coerenza ovunque).
- UI: **toggle secondario** sotto lo switch vista (approccio 1), visibile solo in vista `all` o `family`.

## Obiettivi

1. Toggle **«Considera solo la mia quota»** (default off) sotto il segment control vista.
2. Con toggle on: movimenti `scope=family` contati e mostrati come `amount / memberCount`.
3. Movimenti `scope=personal` e vista `mine`: importo pieno (toggle irrilevante).
4. Riepilogo periodo, riepilogo annuale (totali + griglia mesi) e totali filtrati colonna tabella rispettano la quota.
5. Dialog creazione/modifica movimento: sempre importo **reale** del database.

## Requisiti

| ID | Requisito |
|----|-----------|
| R1 | Toggle visibile solo se `hasFamily` e `view ∈ {all, family}` |
| R2 | Label: «Considera solo la mia quota»; testo aiuto: «I movimenti famiglia sono divisi per N membri» (N dinamico) |
| R3 | Default off; param URL `share=1` quando on; assente quando off |
| R4 | Cambio vista → `mine`: toggle nascosto; param ignorato nel calcolo |
| R5 | Navigazione cashflow (periodo, anno, vista) preserva `share` quando attivo |
| R6 | `memberCount` = membri attuali della famiglia dell'utente |
| R7 | Quota per riga: `round(amount / memberCount, 2)`; totali = somma importi effettivi per riga |
| R8 | Applica quota in `listMovementsForRange`, `getRangeSummary`, `getYearMonthlySummaries` |
| R9 | DB invariato; trasformazione solo in lettura/presentazione |
| R10 | Form movimento: amount non alterato dalla quota |

## Regole di calcolo

| Condizione | Importo effettivo |
|------------|-------------------|
| `share` off | `amount` |
| `view = mine` | `amount` |
| `scope = personal` | `amount` |
| `scope = family` + `share` on | `round(amount / memberCount, 2)` |

| `view` + `share` on | Righe incluse | Calcolo |
|---------------------|---------------|---------|
| `all` | Personali pieni + family divisi | Mix |
| `family` | Solo family divisi | Tutti ÷ N |
| `mine` | Solo personali | Toggle ignorato |

## Database

RLS su `family_members` espone solo la riga dell'utente corrente → un `count(*)` diretto restituirebbe 1.

Aggiungere funzione `security definer` (stesso pattern di `current_user_family_id()`):

```sql
create or replace function public.current_user_family_member_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.family_members
  where family_id = (
    select family_id
    from public.family_members
    where user_id = auth.uid()
    limit 1
  );
$$;
```

Grant `execute` a `authenticated`. Se `memberCount = 0` (edge case): nessuna divisione.

## UI

### Layout

```
[ Tutti | Famiglia | Solo miei ]     ← segment control esistente
[ ] Considera solo la mia quota      ← nuovo, solo all/family
    I movimenti famiglia sono divisi per 3 membri
```

Posizione: sotto `ViewFilter`, sopra `YearSummaryBar` (stesso blocco filtri vista).

Implementazione toggle: `Checkbox` + `Label` (coerente con «Condiviso con la famiglia» nel dialog) oppure `Switch` shadcn se presente nel progetto.

### Alternative scartate

| Approccio | Motivo esclusione |
|-----------|-------------------|
| Quarta opzione segment «Mia quota» | Affolla il control; ambiguo con Tutti vs Famiglia |
| Vista dedicata «Il mio quadro» | Non copre famiglia intera divisa senza secondo controllo |
| Importo pieno + quota tra parentesi | Scelta utente: coerenza numerica ovunque |

## Architettura

```
URL (?view & ?share)
       ↓
cashflow/page.tsx  →  memberCount, share flag
       ↓
lib/cashflow/queries.ts  →  filtro view + applyShare
       ↓
MovementsManager / YearSummaryBar / PeriodSummaryCards / MovementsTable
```

### File

| File | Modifica |
|------|----------|
| `supabase/migrations/…_family_member_count.sql` | Funzione `current_user_family_member_count` |
| `lib/cashflow/share.ts` | `parseShareParam`, `buildShareSearchParams`, `getEffectiveAmount`, `applyShareToMovements`, `applyShareToSummary` |
| `lib/cashflow/share.test.ts` | Unit test calcolo e parsing |
| `lib/families/queries.ts` | `getFamilyMemberCount()` via RPC |
| `lib/cashflow/queries.ts` | Integrare share in list/summary/year |
| `components/cashflow/view-filter.tsx` | Toggle quota + propagazione URL |
| `components/cashflow/movements-manager.tsx` | Props `share`, `memberCount` |
| `components/cashflow/year-summary-bar.tsx` | Preservare `share` in navigazione |
| `components/cashflow/date-range-filter.tsx` | Preservare `share` in navigazione |
| `app/(protected)/cashflow/page.tsx` | Parse `share`, fetch memberCount, passare props |
| `docs/MANUAL_TEST.md` | Checklist quota famiglia |

## Edge case

| Caso | Comportamento |
|------|----------------|
| Famiglia con 1 membro | ÷ 1 = invariato |
| `memberCount = 0` | Nessuna divisione |
| Filtri colonna tabella | «Filtrato:» su importi già divisi (movements trasformati server-side) |
| Edit movimento family | Dialog mostra amount originale |
| Utente senza famiglia | Nessun toggle; `share` ignorato |

## Fuori scope

- Quota storica (membri al momento del movimento)
- Split non equo tra membri
- Badge «quota» sulla riga oltre all'importo diviso
- Persistenza preferenza in profilo (solo URL)

## Test manuali

- [ ] Toggle visibile in Tutti e Famiglia; nascosto in Solo miei e senza famiglia
- [ ] Default off: importi e totali invariati rispetto a oggi
- [ ] Toggle on + Famiglia: importo tabella = pieno ÷ N; totali periodo e anno coerenti
- [ ] Toggle on + Tutti: personali pieni, family divisi; totali mix corretti
- [ ] Testo aiuto mostra N membri corretto
- [ ] Cambio periodo, anno (‹ ›), click mese, cambio vista: `share=1` preservato dove applicabile
- [ ] Vista Solo miei: nessun effetto quota anche con `share=1` in URL
- [ ] Modifica movimento family: form mostra importo pieno, non la quota
- [ ] Famiglia passa da 2 a 3 membri: totali quota ricalcolati con N=3 su tutti i movimenti family
