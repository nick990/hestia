# Design: selezione esplicita dei padri nel picker (solo mobile)

**Data:** 2026-08-31  
**Stato:** approvato in brainstorming  
**Progetto:** Hestia  
**Dipendenze:** `components/cashflow/category-picker.tsx`; Sheet vs Popover già tagliati su `md` (`hooks/use-min-md.ts`); spec picker `2026-08-27-category-picker-design.md`

## Obiettivo

Sul telefono, tap su una categoria **con figli** deve **aprire o chiudere** il gruppo. Assegnare quel livello resta possibile, ma con un controllo distinto (pallino a destra del nome). Su desktop non cambia nulla.

Il modello dati non cambia: si continua a salvare `category_id`.

## Requisiti

| ID | Requisito |
|----|-----------|
| M1 | Vale solo sul viewport dello Sheet: `< md`. Da `md` in su resta: tap sul nome seleziona, tap sulla freccia apre/chiude |
| M2 | Riga **espandibile e selezionabile** (es. `lavoro`, `lavoro.monade`): pallino a destra del nome; tap sul pallino assegna e chiude il picker; tap sul nome **o** sulla freccia apre/chiude |
| M3 | Riga **foglia** (niente figli) e **Nessuna**: tap sulla riga assegna e chiude; niente pallino |
| M4 | Gruppo **virtuale** (nessuna categoria su quel path): niente pallino; tap sul nome o sulla freccia apre/chiude |
| M5 | Pallino vuoto se quel livello non è la scelta corrente; pieno (terracotta / `primary`) se sì. La riga scelta resta con lo sfondo accento già usato |
| M6 | Pallino: `button type="button"` (non `<input type="radio">` nel form movimento), area utile ≥ 44px, `aria-label` «Scegli {etichetta}» |
| M7 | Nome e freccia, quando aprono/chiudono, espongono `aria-expanded` |
| M8 | In ricerca i gruppi restano aperti come oggi; il pallino continua a selezionare il padre se la riga è selezionabile |
| M9 | Manuale (`docs/manuale/cashflow.md`) e checklist (`docs/MANUAL_TEST.md`) descrivono il gesto mobile |

## Fuori scope

- Lista categorie in Impostazioni
- Desktop / Popover
- Schema, action movimenti, materializzazione prefissi (già fatta)
- Long-press, doppio tap, testo «Scegli»

## Decisioni

| Tema | Decisione |
|------|-----------|
| Dove | Solo Sheet (`useMinMd() === false`) |
| Come si sceglie il padre | Pallino a destra del nome, non tap sul nome |
| Come si apre | Tap sul nome o sulla freccia |
| Foglie | Tap sulla riga, senza pallino (due azioni solo dove servono) |
| Gruppo senza id | Solo apri/chiude |
| Controllo | Bottone circolare, non radio nativo |

## Interazione (Sheet)

```
[ lavoro  ○                         ▸ ]   pallino → sceglie `lavoro`
[ lavoro  ●                         ▾ ]   già scelta; tap nome/freccia chiude i figli
[ extra                               ]   foglia: tap riga
[ monade  ○                         ▸ ]   pallino → sceglie `lavoro.monade`
```

## Architettura

Niente cambi in database né nel form (`categoryId` come oggi).

| Pezzo | Ruolo |
|-------|--------|
| `lib/categories/interaction.ts` | Funzione pura `branchInteraction({ mobile, expandable, selectable })` → `{ nameAction: "select" \| "toggle" \| "none"; showRadio: boolean }` |
| `lib/categories/interaction.test.ts` | Copre M1–M4 a livello dati |
| `CategoryPicker` / `BranchRow` | Sullo Sheet usa `mobile: true`; sul Popover `mobile: false`. `showRadio` disegna il pallino |

Regole della funzione (`selectable` = esiste la categoria su quel path):

| mobile | expandable | selectable | nameAction | showRadio |
|--------|------------|------------|------------|-----------|
| no | * | sì | select | no |
| no | sì | no | none | no |
| sì | sì | sì | toggle | sì |
| sì | sì | no | toggle | no |
| sì | no | sì | select | no |

Su desktop il gruppo virtuale resta come oggi: il nome non è un bottone, apre solo la freccia. Sul telefono il nome del virtuale apre/chiude.

## Errori e bordi

- Chiudi senza toccare il pallino: resta la scelta precedente.
- Padre già scelto: pallino pieno; ri-tap sul pallino ri-assegna lo stesso id e chiude (come un tap su una foglia già scelta).
- Overlay / Indietro: invariati (chiude solo il picker).

## Test

Automatici su `branchInteraction` (tabella sopra).

Manuali: sul telefono, tap su `lavoro` apre i figli e non cambia il trigger; tap sul pallino di `lavoro` o `monade` assegna il path intero e chiude. Su desktop, tap sul nome di `lavoro` continua ad assegnare.
