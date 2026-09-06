# Saldi

[Manuale](index.md) · [Cashflow](cashflow.md)

La pagina **Saldi** risponde a «chi deve a chi» in famiglia. Non sostituisce Cashflow: lì restano gli importi veri. Qui conta chi ha anticipato un’uscita e come l’avete spezzata.

Senza famiglia la tab **Saldi** non c’è. Se apri `/saldi` torni alla home.

## Cosa vedi

In alto, solo i trasferimenti che ti riguardano, già semplificati (anche in tre o più persone):

- «Devi pagare 20,00 € a Marco»
- «Sara ti deve 10,00 €»

Se non hai niente da dare né da ricevere: «Sei in pari». Qualcun altro in famiglia può avere ancora un saldo tra di loro.

Sotto, il netto di ciascuno: positivo = gli devono, negativo = deve. Tu sei il primo; poi gli altri per nome. Chi è uscito dalla famiglia compare solo se il suo netto non è zero.

Sotto **Registra rimborso** c'è un'unica lista: uscite ripartite e rimborsi, mescolati, i più recenti in cima. Le prime 20 righe; scorrendo in fondo se ne caricano altre 20. I netti in alto non dipendono da quante righe hai caricato.

Tocca una ripartizione per aprire il movimento (stessa form di Cashflow). Tocca un rimborso per modificarlo.

## Ripartisci spesa

Quando registri o modifichi un’**uscita** (non privata), nel form c’è la sezione **Ripartizione**. Il toggle **Ripartisci spesa** è spento di default: spento = quella spesa non entra nei Saldi.

Da acceso:

- **Chi ha pagato** — di default l’assegnatario, oppure tu se il movimento è di famiglia.
- **Parti uguali** o **Per importo**.
- Spunte sui membri (tutti accesi all’inizio). Il pagante può non essere tra gli spuntati.

I totali di Cashflow non cambiano. In lista movimenti non compare chi ha pagato né come avete diviso.

Su un’entrata o su un’uscita privata la sezione non c’è. Se spunti Privato o passi a entrata, la ripartizione si toglie al salvataggio.

## Rimborsi

**Registra rimborso** segna che qualcuno ha dato soldi a qualcun altro per pareggiare. Non è un movimento: non finisce in Cashflow, nei totali o nel Sankey.

Puoi scegliere la data (di default oggi), chi ha dato, chi ha ricevuto e l'importo. In modifica: **Modifica rimborso**, con Elimina nel dialog (c'è una conferma). I netti cambiano solo se cambi da, a o importo; la data sposta solo la riga nella lista.

## Esempio

Spesa di casa 80 €, Nic ha pagato, parti uguali tra Nic e Sara. Nic vede «Sara ti deve 40,00 €». Sara registra un rimborso di 40 € a Nic: siete in pari, Cashflow è rimasto com’era.
