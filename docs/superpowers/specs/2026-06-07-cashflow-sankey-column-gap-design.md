# Cashflow — Spacing verticale Sankey (gap colonna vs padding link)

**Data:** 2026-06-07  
**Stato:** Approvato

## Problema

1. Aumentare V **rimpicciolisce** il grafico invece di allargarlo verticalmente.
2. Nodi dello stesso livello possono **sovrapporsi** dopo allineamento link.

## Causa

Un solo parametro alimentava d3 `nodePadding` (riduce `ky` in extent fisso), gap colonna e allineamento link. `resolveSameLevelOverlaps` girava prima di `alignSankeyLinks` / `finalizeLinkAlignment`.

## Soluzione

| Parametro | Default | Uso |
|-----------|---------|-----|
| `columnGapY` (UI **V**) | 12 | Gap minimo tra nodi adiacenti in colonna |
| `linkPadding` (fisso) | 12 | d3 first pass, `targetTop`/`sourceTop`, snap |

**Pipeline:** grouped order → alignment → snap → **`enforceMinColumnGap(columnGapY)`** → **`finalizeLinkAlignment`** (ultimo).

**Altezze nodi:** da d3 con `linkPadding` fisso; `innerHeight` da valori grafo, non da `columnGapY`. `viewHeight` = max `y1` finale (cresce con V).

## Requisiti

| ID | Requisito |
|----|-----------|
| S1 | V↑ → `contentHeight`↑, altezze barre (∝ valore) invariate |
| S2 | Gap ≥ V px tra nodi adiacenti stessa colonna (x0), mai overlap |
| S3 | `linkPadding` non esposto in UI |
| S4 | H invariato (130% scale) |

## Fuori scope

- Persistenza V/H in localStorage
- Label collision avoidance oltre gap nodi
