# Design: aggiungere un figlio da Impostazioni → Categorie

**Data:** 2026-08-31  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia  
**Dipendenze:** `components/settings/categories-manager.tsx`; `createCategory` in `app/actions/categories.ts`; albero `lib/categories/tree.ts`; prefissi `lib/categories/prefixes.ts`

## Obiettivo

Dalla lista categorie in Impostazioni, un admin può creare una categoria **sotto** una riga esistente, senza riscrivere tutto il path da zero.

## Requisiti

| ID | Requisito |
|----|-----------|
| C1 | Solo admin (`canEdit`). User vede la lista senza l’azione |
| C2 | Su ogni riga (categoria reale o gruppo virtuale) il menu ha **Aggiungi sotto**, sopra Modifica |
| C3 | Si apre lo stesso dialog di creazione. Titolo «Aggiungi categoria». Campo Nome precompilato con `{path}.` (es. `lavoro.`, `lavoro.monade.`) |
| C4 | L’utente può completare o cambiare tutto il path. Salvataggio = `createCategory(name)` già esistente (prefissi materializzati) |
| C5 | Nome non valido: vuoto, >100 caratteri, o un segmento vuoto (`lavoro.`, `casa..gas`). Errore «Nome non valido.» |
| C6 | Nome già usato (case-insensitive): errore attuale di duplicato |
| C7 | Dopo il successo: dialog chiuso, toast «Categoria aggiunta.», il path padre della nuova riga è **aperto** così il figlio si vede |
| C8 | «Aggiungi categoria» in alto resta: dialog vuoto, path da zero |
| C9 | Manuale e `docs/MANUAL_TEST.md` aggiornati |

## Fuori scope

- Cambiare schema o RLS
- Creare il figlio dal picker del form movimento
- Drag & drop o indent «nuovo figlio» inline nella tabella
- Nuova action server: si riusa `createCategory`

## Decisioni

| Tema | Decisione |
|------|-----------|
| Dove | Voce di menu sulla riga, non un secondo pulsante in tabella |
| Nome | Path intero precompilato con `{path}.`, non solo l’ultimo segmento |
| Validazione segmenti | In `parseName` (o accanto): nessun pezzo vuoto dopo lo split su `.` |
| Dopo il salvataggio | Aprire i path verso il nuovo nome (`selectedExpandPaths`) |

## Interazione

```
lavoro  ⋯ → Aggiungi sotto
           Modifica
           Elimina

Dialog:
  Titolo: Aggiungi categoria
  Nome:   [lavoro.|        ]
```

Cursore in fondo al prefill. Invio chiama `createCategory`.

## Architettura

| Pezzo | Ruolo |
|-------|--------|
| `CategoriesManager` | Stato `parentPath` (o prefill in `name`); `openCreateChild(path)`; voce menu; dopo create, `setExpanded` con `selectedExpandPaths(parsedName)` |
| `parseName` / helper in `lib/categories/` | Rifiuta segmenti vuoti; test unitario |
| `createCategory` | Usa il parse aggiornato; resto invariato |

`path` della riga è già su `SettingsCategoryRow` (`row.path` per i group, `row.category.name` per le foglie depth 2).

## Errori e bordi

- Annulla / chiudi: niente insert, prefill perso.
- Prefill `lavoro.` inviato così com’è → «Nome non valido.»
- Figlio sotto una foglia (`casa.mutuo` → `casa.mutuo.rata`): ok; la foglia diventa padre nel picker.
- Figlio sotto gruppo virtuale: ok; si crea il path digitato (e i prefissi mancanti).

## Test

Automatici: `parseName` (o `parseCategoryName`) accetta `lavoro.bonus`, rifiuta `lavoro.`, `casa..gas`, spazi-only.

Manuali: admin su `lavoro` → Aggiungi sotto → `lavoro.bonus` → compare sotto lavoro aperto. User non vede la voce. «Aggiungi categoria» in alto resta vuoto.
