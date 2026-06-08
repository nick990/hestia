---
name: Hestia
description: Strumento domestico per tracciare entrate e uscite condivise
colors:
  background: "oklch(0.995 0.004 42)"
  ink: "oklch(0.21 0.02 42)"
  primary: "oklch(0.47 0.11 42)"
  primary-on: "oklch(0.99 0.005 42)"
  surface-muted: "oklch(0.965 0.009 42)"
  ink-muted: "oklch(0.48 0.03 42)"
  border: "oklch(0.91 0.012 42)"
  input-stroke: "oklch(0.91 0.012 42)"
  focus-ring: "oklch(0.55 0.09 42)"
  destructive: "oklch(0.52 0.16 25)"
  income: "oklch(0.46 0.1 158)"
  income-muted: "oklch(0.96 0.028 158)"
  expense-muted: "oklch(0.96 0.022 25)"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.35
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  page: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-on}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-on}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    height: "32px"
  card-default:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Hestia

## 1. Overview

**Creative North Star: "La Bacheca Familiare"**

Hestia è uno strumento privato per coppie e coinquilini: tutti devono vedere lo stesso riepilogo, capire subito cosa è personale e cosa è condiviso, e agire senza attrito. Il design segue quella metafora: una bacheca chiara, leggibile, senza ornamenti da marketing né densità da home banking.

La base visiva è **Restrained** con accento **Terracotta Focolare**: neutri tintati (mai cream), tipografia Geist, componenti compatti. Il calore arriva dal terracotta sulle azioni e dalla semantica finanziaria (verde salvia entrate, rosso caldo uscite), non da sfondi decorativi. L'elevazione è **leggermente sollevata**: ombra soft e ring sottile, non piatte né flottanti.

Il sistema rifiuta esplicitamente landing SaaS cream, fintech flashy, home banking corporate, estetica infantile e pattern "AI slop" elencati in `PRODUCT.md`.

**Key Characteristics:**

- Neutri tintati come fondo; terracotta per azioni e brand; verde/rosso solo per dati finanziari
- Una sola famiglia tipografica (Geist) per tutta l'UI prodotto
- Componenti compatti (32px di altezza standard), angoli morbidi (8–14px), transizioni brevi
- Profondità tramite ombra leggera + ring sottile, non glassmorphism né gradienti
- Dati in primo piano: totali, tabelle, Sankey leggibili senza rumore decorativo
- Italiano diretto; etichette verbo+oggetto; nessun eyebrow uppercase su ogni sezione

## 2. Colors

Palette **Restrained** con accento **Terracotta Focolare** (hue 42): neutri tintati verso il brand a chroma 0.004–0.012, mai cream. Il terracotta appare su CTA primarie, brand, focus ring e selezioni; verde salvia e rosso caldo portano la semantica finanziaria.

### Primary

- **Terracotta Focolare** (oklch(0.47 0.11 42)): bottoni primari, badge default, checkbox selezionato, brand "Hestia", mese evidenziato nel riepilogo annuale. ≤10% della superficie colorata.
- **Su Terracotta** (oklch(0.99 0.005 42)): testo e icone su primary.

### Neutral

- **Bianco Bacheca** (oklch(0.995 0.004 42)): sfondo pagina, card, popover. Quasi bianco con tinta minima verso il brand: niente cream, niente sabbia.
- **Inchiostro** (oklch(0.21 0.02 42)): testo principale, titoli, numeri neutri.
- **Superficie Muted** (oklch(0.965 0.009 42)): hover nav, footer card, righe tabella al passaggio.
- **Inchiostro Secondario** (oklch(0.48 0.03 42)): label, descrizioni, placeholder, link nav inattivi. Contrasto ≥4.5:1 su sfondo.
- **Bordo Sottile** (oklch(0.91 0.012 42)): bordi card, input, separatori tabella.
- **Anello Focus** (oklch(0.55 0.09 42)): ring focus-visible a 3px al 50% di opacità, tintato verso il brand.

### Tertiary

- **Entrata** (oklch(0.46 0.1 158)): importi positivi, netto ≥ 0, nodi income nel Sankey. Token `--income`.
- **Entrata Muted** (oklch(0.96 0.028 158)): sfondo riquadro entrate e toggle "Entrata" selezionato. Token `--income-muted`.
- **Uscita / Errore** (oklch(0.52 0.16 25)): destructive; uscite, netto negativo, alert errore. Token `--destructive`.
- **Uscita Muted** (oklch(0.96 0.022 25)): sfondo riquadro uscite e toggle "Uscita" selezionato. Token `--expense-muted`.
- **Grafico** (`--chart-income`, `--chart-expense`, `--chart-surplus`): Sankey e visualizzazioni; `--chart-1`…`--chart-5` per categorie.

**The No-Cream Rule.** Sfondi caldi (cream, sand, linen, parchment) sono vietati. Il calore del brand è nel terracotta d'accento e nei neutri tintati, non in un near-white beige.

**The Data-Only Color Rule.** Verde e rosso appaiono solo su numeri, stati e grafici. Mai su sfondi di sezione, mai su bordi decorativi, mai come gradienti.

## 3. Typography

**Display Font:** Geist (system-ui fallback)
**Body Font:** Geist (stessa famiglia per tutta l'UI)
**Label/Mono Font:** Geist Mono (importi tabellari, codici, dati monospace)

**Character:** Tecnica ma morbida. Geist è geometrica e leggibile a dimensioni piccole; pesi medi per titoli, regular per corpo. Nessun display font decorativo: la gerarchia è scala + peso, non famiglia diversa.

### Hierarchy

- **Display** (600, 1.5rem / `text-2xl`, line-height 1.2): titoli pagina ("Impostazioni", login "Hestia"). Solo uno per vista.
- **Headline** (600, 1.125rem / `text-lg`, line-height 1.3): totali riepilogo, cifre principali nelle summary card.
- **Title** (500, 1rem / `text-base`, line-height 1.35): titoli card, dialog, sezioni interne.
- **Body** (400, 0.875rem / `text-sm`, line-height 1.5): testo UI, celle tabella, descrizioni. Max 65–75ch per blocchi di prosa.
- **Label** (500, 0.75rem / `text-xs`, line-height 1.4): etichette filtri, sottotitoli metriche, note esplicative. Mai uppercase su frasi intere.

**The One Family Rule.** Un solo sans (Geist) per heading, body, bottoni e label. Geist Mono solo per dati che beneficiano di allineamento monospace.

**The Fixed Scale Rule.** Scala rem fissa, non fluid clamp. Gli heading non si riducono con il viewport: il layout responsive è strutturale (colonne, sidebar), non tipografico.

## 4. Elevation

Filosofia **leggermente sollevata**: le superfici di contenuto (card, riquadri riepilogo) hanno presenza tangibile tramite ombra soft a riposo e ring sottile al 10% del foreground. Gli overlay (popover, dropdown, dialog) aggiungono `shadow-md` e, per il dialog, backdrop blur leggero. Le tabelle e la nav restano piatte: profondità solo dove il contenuto "fluttua" sopra la pagina.

Non si usa glassmorphism decorativo. Non si usano ombre scure da app 2014.

### Shadow Vocabulary

- **Card Rest** (`box-shadow: 0 1px 3px oklch(0 0 0 / 8%)` + `ring: 1px oklch(0.145 0 0 / 10%)`): card principali, contenitori sezione.
- **Overlay** (`box-shadow: 0 4px 6px -1px oklch(0 0 0 / 10%), 0 2px 4px -2px oklch(0 0 0 / 10%)`): popover, select, dropdown (`shadow-md`).
- **Dialog Backdrop** (`background: oklch(0 0 0 / 10%)`, `backdrop-filter: blur(2px)`): overlay modale.

**The Lifted-Not-Floating Rule.** Ombre basse e diffuse, mai drop-shadow aggressive. Se la card sembra sospesa nel vuoto, l'ombra è troppo forte.

## 5. Components

Sensazione **domestica**: angoli morbidi, transizioni calde (150–200ms), hover con sfondo muted piuttosto che cambi drastici. Familiarità shadcn/base-ui, senza reinventare affordance standard.

### Buttons

- **Shape:** angoli morbidi (8px / `rounded-lg`)
- **Primary:** Inchiostro Azione su Bianco Bacheca, altezza 32px, padding orizzontale 10px, `text-sm font-medium`
- **Hover / Focus:** primary al 80% di opacità; focus ring 3px al 50%; active `translate-y-px` (non su trigger con popup)
- **Secondary:** Superficie Muted con testo Inchiostro Azione; hover con color-mix 5% foreground
- **Ghost:** trasparente; hover Superficie Muted
- **Destructive:** sfondo destructive/10%, testo destructive; mai pieno saturo su azioni secondarie
- **Link:** testo primary con underline al hover

### Chips / Badge

- **Style:** pill (`rounded-4xl`), altezza 20px, `text-xs font-medium`
- **State:** default = primary pieno; secondary = muted; outline = bordo + foreground; usati per filtri e stati compatti

### Cards / Containers

- **Corner Style:** 14px (`rounded-xl`)
- **Background:** Bianco Bacheca
- **Shadow Strategy:** ombra card rest + ring sottile (vedi Elevation)
- **Border:** nessun bordo pieno; il ring sostituisce il bordo visibile
- **Internal Padding:** 16px (`px-4 py-4`); gap interno 16px tra header e content
- **Footer:** `border-t` + `bg-muted/50` per azioni secondarie

### Inputs / Fields

- **Style:** bordo Input Stroke, sfondo trasparente, radius 8px, altezza 32px
- **Focus:** bordo Anello Focus + ring 3px al 50%
- **Error:** bordo destructive + ring destructive/20
- **Disabled:** opacità 50%, `bg-input/50`
- **Placeholder:** Inchiostro Secondario (verificare contrasto)

### Navigation

- **Header:** `h-14`, bordo inferiore, max-width 5xl centrato, padding orizzontale 24px
- **Link:** `text-sm`, muted a riposo, hover Superficie Muted + foreground; active (settings) = `bg-muted font-medium`
- **Brand:** "Hestia" semibold tracking-tight, link a /cashflow
- **Mobile:** stessa struttura; futura home mobile avrà CTA movimento prominente

### Summary Panels (signature)

- **Style:** `rounded-lg border bg-muted/30 p-4` (non card nested)
- **Metriche:** label `text-sm muted`, valore `text-lg font-semibold`, entrata in verde, uscita in ink, netto condizionale
- **Filtro attivo:** riga "Filtrato:" in `text-xs` sotto il totale

### Tables

- **Row hover:** `bg-muted/50`, transizione colori 150ms
- **Header:** `font-medium`, altezza 40px
- **Density:** celle compatte (`p-2`), whitespace-nowrap per importi

## 6. Do's and Don'ts

### Do:

- **Do** usare Geist per tutta l'UI e Geist Mono solo per dati tabellari o codici.
- **Do** mantenere bottoni e input a 32px di altezza (`h-8`) per densità operativa coerente.
- **Do** usare verde solo per entrate/netto positivo e rosso/destructive per uscite, errori e azioni distruttive.
- **Do** rendere ovvio lo stato personale vs condiviso con label, filtri e badge, non con menu nascosti.
- **Do** rispettare `prefers-reduced-motion`: animazioni open/close dei popover come crossfade istantaneo.
- **Do** scrivere in italiano diretto; etichette bottone verbo+oggetto ("Salva movimento", "Esci").

### Don't:

- **Don't** usare sfondi cream, gradienti decorativi o hero-metric template da landing SaaS generiche.
- **Don't** adottare estetica fintech flashy: neon, dark mode da trading, grafici aggressivi.
- **Don't** replicare home banking corporate: interfacce dense, grigio burocratico, gerarchia piatta.
- **Don't** usare estetica infantile o troppo giocosa.
- **Don't** replicare pattern "AI slop": card identiche ovunque, eyebrow uppercase su ogni sezione, palette predefinita senza identità.
- **Don't** usare `border-left` colorato >1px su card, alert o righe lista.
- **Don't** usare gradient text, glassmorphism decorativo o display font su bottoni e label.
- **Don't** annidare card dentro card: i riepiloghi usano pannelli con bordo, non Card shadcn.
- **Don't** aprire modali per azioni che stanno inline (preferire form inline e progressive disclosure).
