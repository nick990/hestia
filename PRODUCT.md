# Product

## Register

product

## Users

Coppie e coinquilini che gestiscono le spese domestiche insieme. Usano Hestia da desktop o telefono, spesso in momenti brevi: dopo un acquisto, a fine mese, o per capire dove sono finiti i soldi. Conoscono già il contesto familiare; non servono spiegazioni lunghe né onboarding da prodotto enterprise.

## Product Purpose

Hestia è uno strumento privato per tracciare entrate e uscite personali e condivise. Oggi la sezione centrale è **Cashflow**; in futuro arriveranno altre aree, ciascuna con il proprio compito. La **home** (`/`) offre un riepilogo del mese con tab Cashflow e Notes su tutti i device. La pagina **Cashflow** (`/cashflow`) è la vista completa (tabella, riepilogo annuale, Sankey). Su mobile, registrare un movimento deve restare a un tap (FAB +). Successo = chiarezza sui flussi di denaro, registrazione senza attrito, fiducia tra i membri della famiglia quando i dati sono condivisi.

## Brand Personality

Calda, domestica, collaborativa. Voce diretta in italiano, mai istituzionale né da campagna marketing. Pratica come un'app per la casa, non come un terminale finanziario. I numeri contano, ma il tono resta umano e rassicurante.

## Anti-references

- Landing SaaS generiche: sfondi cream, gradienti decorativi, hero con metriche giganti
- Fintech flashy: neon, dark mode da trading, grafici aggressivi
- Home banking corporate: interfacce dense, grigio burocratico, gerarchia piatta
- Estetica infantile o troppo giocosa
- Pattern "AI slop": card identiche ovunque, eyebrow uppercase su ogni sezione, palette predefinita senza identità

Riferimento positivo (pratico, orientato all'azione): Splitwise e app domestiche simili, non la loro estetica letterale.

## Design Principles

1. **Casa, non banca** — Il design deve sentirsi domestico e collaborativo, non istituzionale né da prodotto finanziario.
2. **Azione prima del report** — Su mobile, registrare un movimento deve essere più vicino di un tap che aprire un form lungo; il riepilogo serve, ma non blocca l'azione.
3. **Chiarezza sui flussi** — Totali, filtri e visualizzazioni (es. Sankey) devono rispondere subito a "dove va il denaro?", senza rumore visivo.
4. **Trasparenza condivisa** — Quando i dati sono di famiglia, lo stato (personale vs condiviso, chi vede cosa) deve essere ovvio, non nascosto in menu.
5. **Cresce per sezioni** — Ogni nuova area ha un compito chiaro; la shell e la navigazione restano coerenti mentre il prodotto si espande oltre Cashflow.

## Accessibility & Inclusion

Italiano come unica lingua per ora; nessun requisito i18n in v1. Best practice standard: contrasto leggibile, focus visibile, rispetto di `prefers-reduced-motion` per animazioni non essenziali. Nessun vincolo WCAG formale dichiarato oltre a queste basi.
