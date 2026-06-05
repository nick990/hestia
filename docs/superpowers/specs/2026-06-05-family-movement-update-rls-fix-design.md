# Fix RLS — modifica movimenti family da altri membri

**Data:** 2026-06-05  
**Stato:** Approvato

## Problema

La policy `movements_update` consente in USING a un membro di aggiornare movimenti `family` della propria famiglia, ma il `WITH CHECK` richiede `user_id = auth.uid()`. Un membro B che modifica un movimento creato da A fallisce perché `user_id` resta quello di A.

## Comportamento atteso

| Azione | `personal` | `family` |
|--------|------------|----------|
| Modifica | Solo autore | Qualsiasi membro famiglia |
| Elimina | Solo autore | Qualsiasi membro famiglia |
| `user_id` dopo edit | Invariato | Invariato (autore originale) |

## Fix

Sostituire `WITH CHECK` di `movements_update`:

```sql
(scope = 'personal' and user_id = auth.uid() and family_id is null)
or (scope = 'family' and family_id = public.current_user_family_id())
```

`movements_delete` invariata (USING già corretto).

## Test manuali

- [ ] B modifica movimento family di A → OK; «Inserito da» resta A
- [ ] B elimina movimento family di A → OK
- [ ] B non modifica personali di A → bloccato
