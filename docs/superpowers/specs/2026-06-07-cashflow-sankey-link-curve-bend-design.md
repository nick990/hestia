# Cashflow — Controllo curvatura flussi Sankey (modalità Curvo)

**Data:** 2026-06-07  
**Stato:** Approvato  
**Relazione:** estende toggle Curvo/Dritto; complementa `2026-06-07-cashflow-sankey-straight-link-ribbon-design.md`

## Obiettivo

In modalità **Curvo**, consentire all’utente di spostare il **punto di flesso** orizzontale della Bézier (`t` su asse X) per separare visivamente flussi che si incrociano. Nessun re-layout nodi.

## Parametro

```
xc = x0 + (x1 - x0) × (bend / 100)
Path: M x0,y0 C xc,y0, xc,y1, x1,y1
```

| Parametro | Valore |
|-----------|--------|
| Default | **50** (= simmetrico, identico a d3 `linkHorizontal`) |
| Min | **0** |
| Max | **100** |
| Step | **5** |

## UI

- Controllo **C** (curvatura %), editabile come V/H
- Visibile **solo** con `linkPathMode === "curved"`
- Nascosto in modalità Dritto
- Non resetta zoom (`fitKey` invariato)

## Architettura

| File | Modifica |
|------|----------|
| `lib/cashflow/sankey-link-path.ts` | `curvedLinkPath`, `clampLinkCurveBend`, `createSankeyLinkPath(mode, bend)` |
| `lib/cashflow/sankey-link-path.test.ts` | Test bend 20/50/80 |
| `components/cashflow/sankey-layout-controls.tsx` | Controllo C condizionale |
| `components/cashflow/cashflow-sankey-chart.tsx` | State `linkCurveBend` |

## Fuori scope

- Risolvere overlap reali (layout V/H)
- Curvatura in modalità Dritto
- Persistenza URL/localStorage
