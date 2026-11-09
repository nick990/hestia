# Saldi

[Manuale](index.md) · [Cashflow](cashflow.md)

La pagina **Saldi** risponde a «chi deve a chi» in famiglia. Non sostituisce Cashflow: lì restano gli importi veri. Qui conta chi ha anticipato un’uscita e come l’avete spezzata.

Senza famiglia la tab **Saldi** non c’è. Se apri `/saldi` torni alla home.

## Cosa vedi

In alto, solo i trasferimenti che ti riguardano, già semplificati (anche in tre o più persone):

- «Devi pagare 20,00 € a Marco» — l’importo in **rosso**
- «Sara ti deve 10,00 €» — l’importo in **verde**

Se non hai niente da dare né da ricevere: «Sei in pari». Qualcun altro in famiglia può avere ancora un saldo tra di loro.

In famiglia da **due** persone il messaggio in alto basta: non compare il resoconto con il netto di ciascuno. Da **tre** membri in su, sotto vedi anche il netto di ogni persona (positivo = gli devono, negativo = deve). Tu sei il primo; poi gli altri per nome. Chi è uscito dalla famiglia compare solo se il suo netto non è zero.

Sotto **Registra rimborso** una nota breve spiega cosa compare in lista; sotto, un'unica lista di uscite ripartite e rimborsi, mescolati, i più recenti in cima. Le prime 20 righe; scorrendo in fondo se ne caricano altre 20. I netti in alto non dipendono da quante righe hai caricato (vengono calcolati sul server al caricamento della pagina).

In lista compaiono solo i movimenti tra almeno due persone in cui sei coinvolto. Le altre — ad esempio un caffè offerto registrato solo a tuo nome, o una ripartizione tra altri due — restano in Cashflow e contano comunque nei netti se rilevanti.

Tocca una ripartizione per aprire il movimento (stessa form di Cashflow). Tocca un rimborso per modificarlo.

## Ripartisci spesa

Quando registri o modifichi un’**uscita** (non privata), nel form c’è la sezione **Ripartizione** con **Chi ha pagato** sempre visibile.

- Default pagante: l’**assegnatario** (membro), oppure **Famiglia** se il movimento è di famiglia.
- **Famiglia** come pagante = conto di casa: non entra nei Saldi; la spunta **Ripartisci spesa** resta disabilitata.
- Con pagante membro, la spunta **Ripartisci spesa** è spenta di default: la spesa resta ripartita al **100% sul pagante** (nessun debito tra voi). Accendila per spezzare la spesa tra più persone (parti uguali o per importo).

I totali di Cashflow non cambiano. In Cashflow, sotto l’importo, compare «Pagato da …» (o «Pagato da Famiglia»).

Su un’entrata o su un’uscita privata la sezione non c’è. Se spunti Privato o passi a entrata, il pagamento si toglie al salvataggio.

## Rimborsi

**Registra rimborso** segna che qualcuno ha dato soldi a qualcun altro per pareggiare. Non è un movimento: non finisce in Cashflow, nei totali o nel Sankey.

Puoi scegliere la data (di default oggi), chi ha dato, chi ha ricevuto e l'importo. In modifica: **Modifica rimborso**, con Elimina nel dialog (c'è una conferma). I netti cambiano solo se cambi da, a o importo; la data sposta solo la riga nella lista.

## Esempio

Spesa di casa 80 €, Nic ha pagato, parti uguali tra Nic e Sara. Nic vede «Sara ti deve 40,00 €». Sara registra un rimborso di 40 € a Nic: siete in pari, Cashflow è rimasto com’era.
