# Cashflow

[Manuale](index.md) · [Saldi](saldi.md) · [Notes](notes.md)

Nella pagina **Cashflow** registri i **movimenti**: un’**entrata** o un’**uscita**. Lo stipendio, il mutuo, la spesa al supermercato, un regalo.

L’importo che scrivi è quello vero. Hestia non lo spezza automaticamente tra le persone di casa.

## Chi lo ha messo e a chi “appartiene”

L’**assegnatario** dice a conto di chi (o della famiglia) conta quel soldo. Chi lo ha digitato non compare in lista.

Esempio: tu puoi registrare il mutuo e assegnarlo alla **famiglia**. Oppure registrare una spesa e assegnarla al partner.

## Di famiglia oppure di una persona

- **Di famiglia** — spese e entrate di casa (bollette, mutuo, spesa comune). Tutti i membri della famiglia le vedono.
- **Di una persona** — stipendio, regalo, spesa individuale. Gli altri le vedono solo se non le segni come private.

Se non fai parte di una famiglia nell’app, tutto ciò che registri è solo tuo: non compare il campo Assegnatario.

## Come aggiungerne uno

Dal pulsante **Aggiungi movimento** (sul telefono anche il pulsante + in basso). Indietro del browser chiude la finestra del movimento senza lasciare Cashflow.

**Se stai registrando un’uscita**

Di solito è di casa: in **Assegnatario** è già selezionato **Di famiglia**.  
Se invece è personale, scegli un membro dalla stessa lista (di solito te stesso).  
Solo se l’assegnatario sei tu puoi marcare **Privato**. Se è **Di famiglia**, la casella resta visibile ma spenta.

Se sei in famiglia, sotto trovi **Ripartizione**. Accendi **Ripartisci spesa** per dire chi ha pagato e come spezzarla tra i membri. Non è obbligatorio; i totali di Cashflow restano l’importo intero. In lista, sotto l’importo, compare in piccolo «Pagato da …». I conti tra di voi stanno in [Saldi](saldi.md). Su un’uscita privata la sezione non c’è.

**Se stai registrando un’entrata**

Di solito è personale: l’assegnatario sei tu.  
Se è un’entrata condivisa (per esempio un rimborso di casa), scegli **Di famiglia**.

In entrambi i casi puoi indicare data, importo, una categoria e una descrizione, se ti servono.

Nella **categoria** puoi cercare. All’inizio vedi solo i primi livelli (casa, lavoro, …), in ordine alfabetico. Aprendo un gruppo vedi il secondo livello (`mutuo`, `monade`); se anche quello ha figli, si apre ancora e sotto trovi il resto (`stipendio`). Sul **telefono**, tocca il nome per aprire o chiudere un gruppo con figli; il pallino a destra del nome assegna quel livello (`lavoro` o `lavoro.monade`). Sul **computer**, tocca il nome per assegnare e la freccia per aprire. Senza una scelta resta «Nessuna».

Le categorie si gestiscono in **Impostazioni → Categorie**. Da una riga, **Aggiungi sotto** apre il nome già iniziato con il path del padre (`lavoro.`); completalo e salva.

## Cosa significa «Privato»

Un movimento privato lo vedi **solo tu** (se sei l’assegnatario). Gli altri membri della famiglia no.

Puoi usare «Privato» solo quando l’assegnatario sei tu. Se lo assegni alla famiglia o a un’altra persona, la casella resta visibile ma non si può spuntare.

## Chi può correggere o cancellare

- Movimenti di famiglia o personali **non** privati: chiunque in famiglia può modificarli o eliminarli.
- Movimenti **privati**: solo la persona a cui sono assegnati.

Chi li ha inseriti la prima volta non cambia, anche se un altro membro li aggiorna dopo. Quell’informazione non compare in lista.

## Esempi di tutti i giorni

| Situazione                                 | Cosa scegliere                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| Mutuo o bolletta comune                    | Uscita, di famiglia                                                        |
| Spesa della casa al supermercato           | Uscita, di famiglia                                                        |
| Il tuo stipendio                           | Entrata, personale (tua); privata solo se non vuoi che gli altri la vedano |
| Un regalo che preferisci tenere per te     | Uscita personale tua, privata                                              |
| Un rimborso che arriva sul “conto di casa” | Entrata, di famiglia                                                       |
| Una spesa che vuoi contare sul partner     | Uscita personale, assegnata al partner (non privata)                       |
| Spesa al supermercato pagata da te, da metà | Uscita di famiglia + Ripartisci spesa (parti uguali)                      |

## Cosa Hestia non fa

Non gestisce ancora movimenti che si ripetono ogni mese, allegati o altre valute.  
Chi deve a chi sta in [Saldi](saldi.md), non nei totali di questa pagina.

## Dove li trovi

- **Cashflow** (`/cashflow`) — mese in corso, totali, lista movimenti, pulsante + per aggiungerne uno.
- **Vista avanzata** (`/cashflow/avanzato`) — tabella completa, filtri, mesi dell’anno, grafico Sankey. Link **Vista semplificata** in fondo per tornare a `/cashflow`.
- **Saldi** (`/saldi`) — chi deve a chi, se sei in una famiglia.
- **Notes** e **In evidenza** — tab accanto a Cashflow nella riga sotto l’header.
