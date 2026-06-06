# Cashflow — blocco cambio visibilità per non autori

**Data:** 2026-06-06  
**Stato:** Approvato  
**Estende:** `2026-06-05-families-design.md`, `2026-06-06-movement-ownership-naming-design.md`

## Contesto

Oggi qualsiasi membro della famiglia può modificare un movimento `family`, incluso il toggle «Privato» che cambia `scope`. Un membro potrebbe rendere privato un movimento condiviso inserito da un altro (es. Nic rende privato un movimento di Sara), alterando la visibilità senza consenso dell’autore.

Decisioni prese in brainstorming:

- **Solo visibilità bloccata** per non autori: importo, data, descrizione e categoria restano modificabili su movimenti `family` altrui.
- **UI:** checkbox «Privato» disabilitato con testo di aiuto per non autori in modifica.
- **Server:** validazione in `updateMovement`; errore se non autore tenta cambio `scope`/`family_id`.
- **Approccio 1:** validazione server + UI; nessuna migration DB.

## Obiettivi

1. Solo l’autore (`user_id`) può cambiare la visibilità (privato ↔ famiglia).
2. I non autori possono ancora correggere importo, data, descrizione, categoria su movimenti `family`.
3. UI chiara: checkbox disabilitato + messaggio esplicativo.
4. Protezione server-side contro bypass UI.

## Requisiti

| ID | Requisito |
|----|-----------|
| R1 | In `updateMovement`, caricare movimento esistente (`id`, `user_id`, `scope`, `family_id`) prima dell’update |
| R2 | Se `auth.uid() !== existing.user_id` e (`scope` o `family_id` richiesti ≠ esistenti) → errore: «Solo l'autore può cambiare la visibilità di questo movimento.» |
| R3 | Se non autore e visibilità invariata → update degli altri campi consentito |
| R4 | Autore può cambiare visibilità liberamente sui propri movimenti |
| R5 | `createMovement` invariato |
| R6 | `deleteMovement` invariato (chiunque in famiglia può eliminare movimenti `family`) |
| R7 | Prop `currentUserId` passata a `MovementsManager` da `cashflow/page.tsx` |
| R8 | `canChangeVisibility = !editingMovement \|\| editingMovement.user_id === currentUserId` |
| R9 | Checkbox «Privato» disabilitato quando `!canChangeVisibility` in modifica |
| R10 | Testo aiuto sotto checkbox, visibile solo se disabilitato: «Solo l'autore può cambiare la visibilità» |
| R11 | Creazione movimento: checkbox sempre abilitato (se `hasFamily`) |

## Matrice permessi

| Scenario | Modifica campi | Cambio visibilità |
|----------|----------------|-------------------|
| Autore, movimento proprio | ✓ | ✓ |
| Non autore, movimento `family` altrui | ✓ | ✗ |
| Autore, movimento `private` proprio | ✓ | ✓ |

I movimenti `private` altrui non sono visibili (RLS); nessun caso aggiuntivo.

## Architettura

### Server (`app/actions/movements.ts`)

Flusso `updateMovement`:

```ts
// 1. Fetch existing
const { data: existing } = await supabase
  .from("movements")
  .select("user_id, scope, family_id")
  .eq("id", id)
  .maybeSingle();

// 2. Resolve scope from isPrivate (come oggi)

// 3. Guard visibilità
const visibilityChanged =
  scope !== existing.scope || family_id !== existing.family_id;

if (existing.user_id !== user.id && visibilityChanged) {
  return { ok: false, error: "Solo l'autore può cambiare la visibilità di questo movimento." };
}

// 4. Update
```

### UI

- `app/(protected)/cashflow/page.tsx` — passa `currentUserId={user.id}` a `MovementsManager`
- `components/cashflow/movements-manager.tsx` — logica `canChangeVisibility`, checkbox `disabled`, testo aiuto

## Fuori scope

- Blocco modifica/eliminazione per non autori su movimenti altrui
- Trigger Postgres o nuove policy RLS
- Cambio permessi delete su movimenti `family`

## Test manuali

1. Sara crea movimento famiglia → Nic modifica importo → OK, visibilità invariata.
2. Nic apre modifica movimento di Sara → checkbox «Privato» disabilitato + messaggio aiuto.
3. Sara modifica il proprio movimento famiglia → può attivare «Privato» → movimento sparisce a Nic.
4. Nic tenta API/server action con `isPrivate: true` su movimento altrui → errore server.

## Riferimenti

- Spec famiglie: `2026-06-05-families-design.md`
- Spec naming: `2026-06-06-movement-ownership-naming-design.md`
- Actions: `app/actions/movements.ts`
- UI dialog: `components/cashflow/movements-manager.tsx`
