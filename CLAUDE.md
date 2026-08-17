# Sillage backoffice

Backoffice interne a l'equipe Sillage — pas l'application des clients (voir
`../frontend/CLAUDE.md`, l'app tenant). Angular 21, meme stack technique que `frontend/`
(Material, Vitest, standalone components, signals), mais **projet, repo et modele de securite
completement separes**. Ne jamais partager de code entre les deux (voir plus bas, "Pourquoi un
projet separe").

En cas de doute sur une regle metier (fiscalite, RBAC, cycle de vie d'une donnee), se referer a
`../backend/CLAUDE.md`, qui reste la source de verite metier — en particulier sa section
"Backoffice plateforme (`nc.sillage.platform`)", qui documente le cloisonnement cote serveur que
ce projet consomme.

## Direction visuelle : un outil, pas un produit

**Le backoffice ne reprend deliberement pas la direction du frontoffice** — ni son lagon, ni sa
Fraunces, ni ses aplats de marque. Deux raisons, et la seconde compte plus que la premiere :

1. **Le public n'est pas le meme.** Une poignee d'administrateurs qui viennent faire un geste
   precis, pas une gerante qui passe sa journee dedans. Ce qu'ils veulent est de la densite et de
   la lisibilite, pas une identite.
2. **Les deux applications s'ouvrent dans des onglets voisins.** Une difference visuelle franche
   dit d'un coup d'oeil ou l'on se trouve — et se tromper d'application quand on a acces aux
   donnees de **tous** les clients serait autrement plus grave qu'une page austere. La pastille
   « BACKOFFICE » du bandeau existe pour ca.

Corollaire assume : **aucun cout d'entretien**. Pas de police a heberger (pile systeme), pas
d'image, pas d'animation, pas de theme sombre — personne n'y passe assez de temps pour que ce
dernier en vaille la maintenance. `styles.scss` et le gabarit du shell portent tout.

- **Chrome neutre, accent reserve aux actions.** Le bandeau etait un `mat-toolbar color="primary"`
  peint en azure sur toute la largeur : cela donnait un air d'application grand public. Il est
  desormais ardoise, et la couleur ne sert qu'aux boutons et aux liens.
- **Densite `-1`.** Un outil d'administration montre des tableaux, pas des cartes aerees. `-2`
  rendait les champs de saisie inconfortables a la frappe.
- **Les cartes ont une bordure, pas d'ombre.** Sur un fond legerement teinte, une bordure fine
  suffit a poser la surface, et une pile d'ombres donne un aspect brouillon des qu'il y en a
  plusieurs.
- **`.bo-page`, `.bo-page-title`, `.bo-page-intro` portent le rythme.** Chaque ecran posait sa
  propre largeur et son propre padding : deux ecrans voisins ne s'alignaient pas. Meme lecon que
  `.sillage-page-header` cote frontoffice, autre vocabulaire.
- **Les chiffres sont tabulaires** (`.bo-numeric`) : une colonne de taux se compare a la
  verticale, ce qu'une chasse variable rend impossible.

### La marque : presente, mais dans une autre variante que le frontoffice

Les fichiers de `public/logo/` sont **les memes** que ceux du frontoffice — meme geometrie, trois
variantes qui ne different que par le fond du carre arrondi (prune `#8A3D63`, encre `#17130F`,
creme `#FBF9F6`).

- **Le favicon est en encre, la ou le frontoffice porte la prune**, et ce n'est pas une preference
  de couleur. Le favicon est **ce qui identifie un onglet** : deux marques identiques rendraient
  les deux applications indistinguables des que les titres sont tronques, ce qui est le cas
  courant. C'est exactement l'argument de la pastille « Backoffice » du bandeau, applique a
  l'endroit ou il compte le plus. Verifie a 16 px sur une barre d'onglets claire **et** sombre :
  l'encre garde ses trois traits creme lisibles sur les deux.
- **Le bandeau porte la variante creme**, parce qu'il est ardoise et que l'encre y disparaitrait.
  Meme marque, adaptee a son fond — c'est a ca que servent les trois variantes. Verrouille par un
  test : se tromper de variante donne un carre invisible que personne ne remarque en relisant le
  gabarit.
- **L'ecran de connexion porte l'encre**, comme le favicon : la carte est sur fond clair, et c'est
  le seul ecran ou l'on arrive sans savoir encore ou l'on est tombe.
- **`alt` vide partout, et aucun lien** : le mot « Sillage » est ecrit juste a cote. Un `alt`
  renseigne ferait annoncer la marque deux fois par un lecteur d'ecran.
- **`favicon.ico` est rasterise depuis la geometrie du SVG**, en sept tailles (16 a 256), **chacune
  rendue a sa taille reelle** plutot que reduite depuis la plus grande : a 16 px, une reduction
  depuis 256 fond les trois traits entre eux. Le script de generation vit hors du depot — il ne
  sert qu'a produire ces fichiers, et les fichiers sont ce qui est versionne.
- **Rien d'autre n'entre** : pas de lockup, pas d'animation, pas d'illustration. Trois `<img>` au
  total, sans composant dedie — la ou le frontoffice a un `BrandMark`. La regle « aucun cout
  d'entretien » ci-dessus n'est pas suspendue parce qu'on a ajoute une image.

## Pourquoi un projet separe, pas un ecran de plus dans `frontend/`

Un compte du backoffice (`PLATFORM_ADMIN`) traverse toutes les organisations clientes — ce n'est
pas un role de plus dans le RBAC tenant (`ORG_OWNER`/`SALON_{id}_{ROLE}`), c'est un modele
d'identite different, sans lien avec `Organization`/`AppUser`. Le melanger dans le meme bundle
Angular que celui livre aux clients aurait expose du code et des routes d'administration interne
sur la meme surface que l'app front-office. D'ou trois projets independants
(`sillage-backend`, `sillage-frontend`, `sillage-backoffice`), chacun son propre repo, dans un
dossier parent non versionne (`~/Documents/kaimana/`).

## Authentification : session propre, jamais celle du frontend tenant

`core/auth/` reproduit le pattern de `frontend/src/app/core/auth/` — **sans en partager le code**.
Un jeton emis pour l'application des salons n'authentifie jamais une requete `/api/v1/platform/**`,
et reciproquement : deux applications distinctes chez le fournisseur, deux audiences, deux chaines
de securite etanches cote backend (voir `nc.sillage.identity.SecurityConfig`). Reproduire le
pattern plutot que le partager evite de creer un point de couplage entre les deux mondes qu'on
cherche precisement a isoler.

Le detail du flux est decrit plus bas (« Authentification : externalisee »). Les differences avec
le pattern tenant tiennent en deux points :

- **Cle de stockage distincte** (`sillage-backoffice.token`), pour ne jamais collisionner avec
  celle du frontend si les deux applications tournent sur le meme navigateur.
- **Pas d'inscription en libre-service, et pas de rattachement automatique.** Le nombre de comptes
  est volontairement tres restreint : il faut qu'une ligne de `platform_admins` porte deja le `sub`
  du fournisseur. Quelqu'un qui s'authentifie sans elle obtient un jeton valide et **aucune
  autorite** — 403 partout — et l'ecran le lui dit. Ce backoffice donne acces aux donnees de
  **tous** les clients : son ouverture ne peut pas etre un effet de bord d'une connexion.

## Abonnements (`subscriptions/`) : la page d'accueil, parce que c'est la seule ou l'inaction se paie

**C'est l'ecran d'accueil du backoffice**, avant les taxes. Ce n'est pas un choix d'importance mais
de consequence : une annonce de la DSF attend qu'on la saisisse, alors qu'un essai termine
**ferme la caisse d'un client** — et jusqu'a ce module, rien ne pouvait la rouvrir (voir
`../backend/CLAUDE.md`, « Administration des abonnements »).

- **L'ecran s'ouvre sur les echeances, pas sur la liste complete.** Sa raison d'etre est de dire
  qui va se bloquer ; la liste de tous les clients est un second onglet. **Soixante jours par
  defaut**, pas trente : c'est le delai qui laisse le temps de facturer un annuel et d'etre paye.
- **Ce qui bloque aujourd'hui est compte a part** (`blockedCount`). Dans une liste unique, un client
  dont la caisse est fermee ne se distingue pas d'un client qui expire dans six semaines — or l'un
  attend un geste et l'autre un rappel. Meme raison pour la pastille de statut : un tableau tout
  gris oblige a lire chaque ligne pour trouver celles qui demandent une action.
- **Une date part en `AAAA-MM-JJ`, jamais un instant.** `toISOString()` convertit en UTC : sur un
  poste a Noumea (UTC+11), une date choisie au calendrier repartirait **la veille**. C'est la meme
  erreur d'un jour que celle documentee cote serveur entre Noumea et Papeete, et elle ne se voit
  qu'aux dates limites. Verrouille par un test.
- **Le decompte de jours est calcule sur le poste**, quand le serveur tranche a la sienne : c'est
  une aide a la lecture, pas une regle. Ce qui fait foi est `accessUntil`, affiche a cote.
- **Le refus du serveur s'affiche tel quel**, comme sur l'ecran des taxes : lui seul sait dire
  combien de salons sont actifs, ou pourquoi une date est refusee. Un message generique perdrait
  exactement ce qui aide a corriger.
- **Chaque geste recharge la liste**, plutot que de remplacer la seule ligne concernee. La liste des
  echeances est filtree : un abonnement qu'on vient de couvrir n'en fait plus partie, et le laisser
  affiche ferait croire que le geste n'a rien change.
- **Les gestes voues au refus sont desactives avant d'etre proposes** — prolonger l'essai d'un
  abonnement deja payant, reconduire sans periodicite enregistree — et l'ecran **dit pourquoi**
  plutot que de griser en silence. Meme principe que le selecteur de tranche fiscale.
- **« Arreter » explique ce qu'il ne fait pas** : rien n'est supprime, les salons et l'historique
  restent, l'acces court jusqu'au terme paye, et le geste se defait. Sans cette phrase, personne
  n'oserait cliquer — et le support recevrait l'appel qu'on cherche a eviter.
- **Les libelles des offres et des periodicites viennent du serveur** (`/options`), avec le plafond
  de salons de chaque offre. Recopies ici, ils divergeraient au premier changement de nom, et
  l'ecran afficherait alors autre chose que ce qu'il envoie — sans qu'aucun appel n'echoue. Meme
  regle que les moyens de paiement cote tenant. Si `/options` echoue, seul le changement d'offre
  devient indisponible : le reste de l'ecran continue de fonctionner.

## Administrateurs (`admins/`) : ce qui remplace le SQL en production

Rattacher un administrateur plateforme etait le dernier geste courant du produit sans aucune API :
il fallait inserer la ligne a la main dans `platform_admins`. Un geste rare, mais qui revient a
chaque arrivee et a chaque depart dans l'equipe, et qui obligeait a ouvrir une session sur la base
de **tous** les clients pour ecrire quatre colonnes.

- **« Actif » et « En attente de rattachement » ne veulent pas dire la meme chose**, et c'est tout
  l'enjeu de l'ecran : une fiche active sans identifiant du fournisseur n'ouvre **aucun** acces.
  Les peindre pareil ferait croire l'acces ouvert, et on chercherait la panne ailleurs — chez le
  fournisseur, dans le navigateur, partout sauf ici. L'ordre de lecture compte aussi : desactive
  prime sur non rattache.
- **La marche a suivre est ecrite sur la page**, en trois etapes. Elle n'est devinable par
  personne : on ne connait pas l'identifiant de quelqu'un avant qu'il ne se soit presente une fois
  — et cette premiere connexion **se solde par un refus**, ce qui est attendu et doit etre annonce.
  Sans ces lignes, on cree un compte, on annonce a la personne qu'elle peut entrer, et elle se
  heurte a un mur que rien n'explique.
- **L'identifiant s'affiche en chasse fixe** : c'est une valeur recopiee a la main, donc exactement
  le champ ou une coquille est probable, et il faut pouvoir la relire caractere par caractere. Et
  il est **modifiable** — sans ce chemin, une faute de frappe rendait le compte definitivement
  inutilisable et il fallait rouvrir une session SQL, precisement ce dont on sort.
- **Un champ vide part en `null`, jamais en chaine vide** : cote serveur, l'index unique partiel
  traiterait `""` comme une valeur, et la deuxieme fiche creee ainsi serait refusee sans rapport
  apparent.
- **« Supprimer » n'apparait que sur une fiche jamais rattachee.** Le serveur refuse les autres, et
  offrir un bouton dont on connait le refus d'avance est une invitation a se cogner — meme principe
  que le selecteur de tranche fiscale.
- **Sa propre ligne est marquee « vous ».** Desactiver son propre compte est legitime — on part —
  mais ne doit pas se faire sans le savoir, et le message de confirmation le dit franchement.
- **Le refus du serveur s'affiche tel quel** : lui seul sait dire quelle adresse est deja prise,
  quel compte porte deja cet identifiant, ou qu'on s'apprete a retirer le **dernier** acces.

## Territoires (`territories/`) : ou l'on vend, et ce que le territoire determine

**Un territoire n'est pas une notion fiscale**, et ce module l'a longtemps traite comme telle : le
panneau vivait en tete de la page des taxes, au motif qu'« un ecran separe pour deux interrupteurs
serait une entree de menu de plus pour rien ». **Le raisonnement etait juste, la premisse etait
fausse.** Un territoire determine le <b>fuseau horaire</b> qui decoupe les journees comptables — plus
de vingt heures separent Noumea de Papeete, donc un meme instant n'y tombe pas le meme jour —, le
bareme applicable, le nom porte sur les tickets de ses salons, et l'indicatif telephonique par
defaut des messages sortants. La fiscalite est une de ses **consequences**, pas son cadre.

Le ranger sous les taxes avait un cout concret, et il se mesure : on ne pouvait pas y arriver
directement, rien ne disait qu'un territoire porte un fuseau, et la prochaine question territoriale
— une devise, un plan de numerotation — n'aurait eu nulle part ou aller. Cote serveur, la meme
correction : le concept a quitte `nc.sillage.tax` pour `nc.sillage.territory` (voir
`../backend/CLAUDE.md`).

- **L'ecran porte des faits, pas un interrupteur.** Une carte par territoire : son code, sa taxe,
  son **fuseau rendu en heure locale courante**, et le nombre de **salons en activite**. C'est ce qui
  fait gagner a l'ecran la place qu'on lui refusait — et l'heure locale est ce qui rend le fuseau
  tangible : lire « Pacific/Tahiti » n'apprend rien, lire qu'il y est une autre heure fait
  comprendre d'un coup pourquoi une journee comptable ne se decoupe pas au meme moment.
- **Le serveur rend l'identifiant IANA, le client met en forme.** Un fuseau que le navigateur ne
  connait pas retombe sur l'identifiant brut plutot que de casser l'ecran : mieux vaut afficher
  « Pacific/Tahiti » que rien.
- **Le nombre de salons est ce qu'il faut savoir avant de fermer.** Fermer n'eteint rien — mais
  fermer sans savoir combien d'etablissements y operent, c'est fermer a l'aveugle. Le compte remonte
  du module `salon` par inversion de dependance (`TerritoryOccupancy`), `salon` dependant deja de
  `territory`.
- **Le texte dit ce que fermer ne fait pas**, et il le dit avec le chiffre : les salons qui operent
  deja continuent d'encaisser, de cloturer et d'archiver. Sans cette phrase, personne n'oserait
  fermer un territoire — on croirait couper des clients qui paient.
- **Une note dit ce qu'une case a cocher ne peut pas faire** : ouvrir un territoire que le logiciel
  ne connait pas (Wallis) demande une version du produit — il lui faut son fuseau, son regime et son
  bareme, qu'aucun reglage ne peut inventer.
- **En cas de refus, on recharge l'etat reel.** Laisser l'interrupteur sur la position cliquee
  ferait croire a un changement qui n'a pas eu lieu — c'est le mode de defaillance propre aux
  interrupteurs, et il est silencieux.
- **Le piege de test a disparu avec le panneau** : la spec de `tax-page` n'a plus a servir l'appel
  des territoires. C'etait un couplage entre deux ecrans dont l'un n'avait aucune raison de connaitre
  l'autre, et il se manifestait par un `httpMock.verify()` qui pointait vers les territoires plutot
  que vers ce que le test verifiait.

## Rubriques : la navigation predit ou chercher

Les huit ecrans etaient **a plat** dans le bandeau, dans un ordre qui ne disait rien. Rien ne
permettait de prevoir ou chercher, et chaque ecran ajoute allongeait la liste d'un cran.

**Quatre rubriques, deux ecrans chacune** (`shell/navigation.ts`) : **Commercial** (abonnements,
offres), **Clients** (organisations, salons), **Référentiel** (territoires, taxes), **Plateforme**
(administrateurs, journal). Le decoupage suit **ce dont on parle** — ce qu'on vend, les clients qui
l'achetent, ce qui s'applique a tous, et nous — jamais la nature technique de l'ecran.

- **« Commercial » vient en premier** parce que c'est la seule rubrique ou l'inaction se paie : une
  echeance manquee ferme la caisse d'un client. Les autres attendent sans consequence.
- **« Territoires » precede « Taxes »** dans le referentiel : on decide ou l'on vend avant de decider
  comment on y taxe.
- **Une rubrique doit reduire la recherche.** C'est la lecon du menu du frontoffice, ou « Gestion »
  couvrait sept entrees sur onze et ne permettait donc de rien prevoir. Un test refuse toute rubrique
  qui depasserait la moitie des ecrans.
- **La navigation est une donnee, pas un gabarit.** Recopiee dans le HTML, elle serait
  inverifiable : `shell.spec.ts` epingle que **tout ecran de premier niveau figure au menu une fois
  et une seule**, et que les libelles des rubriques ne changent pas en silence. C'est l'invariant que
  le frontoffice s'est donne apres avoir laisse six entrees sans icone et dix-sept ecrans afficher
  une rubrique abandonnee — ici il a attrape les territoires, atteignables uniquement en passant par
  les taxes.
- **La navigation quitte le bandeau pour un rail lateral.** Huit entrees groupees ne tiennent pas
  dans une barre horizontale, et les rubriques sont ce qui rend le menu previsible.
- **Le rail reste dans la palette neutre** — surface claire, bordure fine, petites capitales
  attenuees — et **pas** dans l'encre sombre du frontoffice. Ce n'est pas une preference : les deux
  applications s'ouvrent dans des onglets voisins, et se tromper d'application quand on a acces aux
  donnees de **tous** les clients coute autrement plus cher qu'un rail austere. Meme argument que la
  pastille « BACKOFFICE » et que le favicon en encre.
- **C'est le filet qui separe, l'intertitre ne fait que nommer.** Seul, un libelle en petites
  capitales attenuees se lit comme du bruit dans une liste — lecon reprise telle quelle du menu du
  frontoffice.
- **Pas d'eyebrow sur les ecrans**, contrairement au frontoffice, et c'est une divergence assumee :
  le rail tient entier a l'ecran avec l'entree courante en aplat sous sa rubrique. Repeter la
  rubrique dans le titre de la page serait de la redite, et la regle « aucun cout d'entretien » de ce
  depot s'applique aussi aux bonnes idees du voisin.

## Fiscalite (`tax/`) : le referentiel s'edite ici, et nulle part ailleurs

**Les tranches sont des donnees**, plus un `enum` : c'est cet ecran qui en cree. Un `enum` cote
client aurait rendu impossible d'afficher la tranche qu'on vient de creer — le defaut se serait vu
immediatement, mais il etait le meme cote frontend tenant, ou il ne se voyait pas.

**Le vocabulaire est pose avant les regimes, pas duplique dans chacun.** Il leur est commun, et le
modele produit l'impose : un produit appartient a l'organisation et se vend dans les deux
territoires. Ce qui distingue les regimes — taux, libelle local, periode — vit dans leur panneau.

**Cinq gestes, et une seule regle les gouverne : un taux qui a pris effet ne se touche plus.**

- Le selecteur de tranche est **groupe en deux** : « deja appliquees ici » et « pas encore
  appliquees ici ». Ce ne sont pas les memes gestes — faire evoluer un taux existant, ou ouvrir une
  tranche que ce territoire n'applique pas. D'ou aussi deux boutons plutot qu'un.
- **Une ligne « a venir » se distingue a l'oeil** et porte un bouton *Annuler* ; une ligne en
  vigueur porte *Fermer*. Sans ce marquage, rien ne dirait ce qui reste manœuvrable.
- **Le refus du serveur s'affiche tel quel**, partout. C'est lui qui sait dire ce qui bloque —
  combien de produits portent encore la tranche, quelle date est trop ancienne. Le message
  generique qui existait auparavant (« vérifiez la date d'effet ») faisait perdre exactement ce qui
  aide a corriger.
- **La grille se lit a une date choisie**, passee ou future. C'est la lecture « par blocs » que
  reclame l'administration du bareme, obtenue sans qu'aucun bloc ne soit stocke. **Quand ce n'est
  pas aujourd'hui, l'ecran le dit en rouge** : sans ce rappel, on lirait une grille passee en
  croyant voir celle du jour, et on programmerait un taux a partir d'une lecture fausse.
- **Revenir a aujourd'hui n'envoie pas la date du jour, mais aucun parametre.** C'est le serveur
  qui sait dans quel territoire se place le regime, et l'ecart Noumea/Papeete est d'un jour entier.
- **`isScheduled` compare a la date du poste**, quand le serveur tranche a la sienne. L'ecart
  possible est d'un jour, et c'est sans consequence : le serveur refuse au besoin, l'ecran ne fait
  qu'eviter de proposer un geste voue au refus.

## Fiscalite : consomme `/api/v1/platform/tax`, jamais `/api/v1/tax`

`TaxService` (`tax/tax.service.ts`) parle exclusivement a `/api/v1/platform/tax/**` — le referentiel
tenant en lecture seule (`/api/v1/tax/**`, consomme par `frontend/`) vit derriere la chaine de
securite tenant et rejette un jeton plateforme (voir cloisonnement plus haut). Les deux services
ne sont donc pas interchangeables malgre des formes de donnees proches.

`tax-page/` programme un nouveau taux (categorie, valeur, libelle, date d'effet) par regime :
c'est la seule ecriture possible sur le referentiel fiscal, jamais une edition ou une suppression
d'un taux historique (voir `TaxAdminService` cote backend, meme principe d'inalterabilite que le
reste de Kaimana). Le formulaire ne propose que les categories actuellement ouvertes du regime
(`panel.info.rates`) : programmer un taux pour une categorie fermee echouerait cote backend
(409 CONFLICT), inutile de laisser l'utilisateur y arriver.

## Journal de caisse d'un salon (`salons/salon-audit/`)

Sur la fiche du salon : on y arrive avec un litige en tete (« qui a annule ce bon ? »), et un ecran
autonome obligerait a retrouver le salon deux fois. **Absent en creation** — un salon qui n'existe
pas encore n'a pas de journal.

- **Le numero de sequence et l'empreinte sont affiches, et ce n'est pas decoratif** : c'est la
  continuite des numeros qui detecte une suppression, et l'empreinte qui detecte une alteration.
  Devant un litige, ce sont les deux seules colonnes qui prouvent quelque chose. L'empreinte est
  abregee a douze caracteres — entiere, elle chasserait toute la ligne — et complete dans
  l'infobulle.
- **Les dates partent en `AAAA-MM-JJ`, jamais en instant**, et ici l'erreur d'un jour **n'est pas
  cosmetique** : le serveur resout ces bornes dans le fuseau du salon, donc `toISOString()` — qui
  convertit en UTC — retournerait les ecritures d'un autre jour depuis un poste a Noumea. L'ecran le
  dit d'ailleurs en clair sous le tableau.
- **Un filtre absent ne filtre pas** : aucun parametre vide n'est envoye, c'est le serveur qui
  decide. Meme convention que la date de la grille fiscale.
- **Changer un filtre ramene a la premiere page**, sinon on reste sur une page qui n'existe plus.
- **Sans les libelles de nature, seul ce filtre disparait** : le journal reste lisible.
- **Piege des tests** : les `effect()` ne s'executent pas sans cycle de detection. Un
  `fixture.detectChanges()` manquant apres une mutation de signal fait echouer le test en annoncant
  une URL absente — message qui pointe vers la requete, jamais vers l'effet non declenche.

## Le navigateur ne detient plus aucun jeton (BFF)

Le jeton arrivait dans le fragment de l'URL puis vivait dans le `localStorage` — lisible par
**n'importe quelle XSS**, pendant toute la session. Le backend le garde desormais et ne pose qu'un
cookie `HttpOnly`.

- **Ce fichier n'a plus ni `token`, ni `storeToken`, ni `isTokenExpired`.** Il n'y a plus rien a
  ranger ni a inspecter : le seul etat local est « qui suis-je », rendu par `/me`.
- **Le garde n'inspecte plus aucune echeance**, consequence directe : le navigateur n'a rien a lire.
  La session est etablie au demarrage par `provideAppInitializer`, et une expiration survenue
  **pendant** l'ecran se rattrape la ou elle se manifeste — sur le `401` que l'intercepteur
  intercepte. Une verification locale ne pouvait de toute facon jamais faire mieux que le serveur.
- **`restoreSession` ne court-circuite plus rien** : elle demande toujours. Demander est aussi rapide
  que deviner, et ne peut pas se tromper.
- **L'intercepteur ne pose plus d'en-tete**, il declare `withCredentials`. C'est aussi ce qui rend
  la boucle d'antan impossible : il n'y a plus rien a envoyer au mauvais endroit.
- **Angular signe les ecritures tout seul** : il recopie le cookie `XSRF-TOKEN` dans
  `X-XSRF-TOKEN` des lors que l'appel est en meme origine. C'est gratuit ici — l'API est servie par
  le meme nginx — mais **ca cesserait de fonctionner si l'API passait sur un autre domaine**.
- **`clearUserScopedStorage` reste appele alors que plus rien n'est range** : il balaie le jeton du
  modele precedent, qu'un navigateur deja ouvert porte encore.
- **La page `/callback` ne lit plus de fragment** et ne fait plus de `replaceState` : celui-ci
  n'existait que pour faire disparaitre le jeton de la barre d'adresse. Il ne reste dans l'URL que
  la destination.

## Le jeton ne sort jamais de `/api/v1/platform/`

**Une panne complete a coute cette regle**, et elle vaut d'etre retenue telle quelle : le pied de
page des versions lit `/api/v1/version`, une route **tenant** ouverte. L'intercepteur y collait le
jeton plateforme — or **`permitAll` ne dispense pas de valider un jeton present** : la chaine tenant
le rejetait en `401` faute d'audience. Le `401` declenchait une reconnexion, qui ramenait au meme
point. Backoffice inutilisable, en boucle.

- **L'intercepteur n'autorise que les routes plateforme.** Un jeton plateforme n'a rien a faire sur
  une route tenant : c'est le cloisonnement meme du produit, et l'y envoyer ne le rendait pas
  seulement inutile, ca cassait tout.
- **Il ne reconnecte pas sur un `401` venu d'ailleurs** : ce n'est pas notre session qui est en
  cause, et reconnecter redonnerait le meme resultat.
- **Le defaut etait invisible au `curl`** : sans jeton, la meme route repond `200`. Il ne se
  manifeste que **connecte** — exactement la panne CORS documentee cote backend, ou sept
  verifications passaient au vert sur un site hors service. **Verifier une route ouverte depuis le
  backoffice suppose d'envoyer un `Authorization`**, sinon on ne verifie pas ce que l'application
  vit reellement.
- Verrouille par deux tests, et **eprouves a l'envers** : le correctif retire, ils echouent tous les
  deux.

## Les deux versions en pied de page

« Qu'est-ce qui tourne reellement ? » est la question qui precede toutes les autres, et le besoin
n'est pas theorique : plusieurs echanges ont ete perdus, cote frontend, a diagnostiquer un ecran
qui n'etait pas celui en ligne, la CI n'ayant pas livre.

- **Les deux conteneurs se deploient separement**, donc les deux versions se lisent separement :
  l'un peut etre a jour et l'autre non, et c'est exactement le cas ou l'on cherche a comprendre.
  Le pied les montre cote a cote.
- **En pied et non en bandeau** : on ne le lit que lorsqu'on le cherche — mais il doit toujours
  etre la, sans navigation, parce qu'on le cherche precisement quand quelque chose ne va pas.
- **Un echec se dit, il ne se cache pas** : « inconnue » plutot qu'une ligne masquee. Ne pas
  pouvoir lire la version du serveur **est** un diagnostic.
- **Lues une fois au demarrage du shell** : elles ne changent pas pendant une session, et les
  resonder ferait deux requetes de plus a chaque navigation.
- **`/api/v1/version` est ouverte sans authentification** cote backend, precisement parce qu'elle
  sert quand plus rien ne fonctionne — elle ne divulgue qu'un SHA. Elle passe par la chaine
  **tenant** (le `securityMatcher` plateforme ne couvre que `/api/v1/platform/**`), donc a travers
  la passerelle sans jeton. Verifie en ligne, avec les en-tetes de cache : les deux reponses sont
  `no-store` et `DYNAMIC` chez Cloudflare — une version mise en cache mentirait au moment ou l'on a
  besoin qu'elle dise vrai.
- **Piege des tests** : le shell fait desormais deux lectures au demarrage. Tout test qui le cree
  doit les servir, sinon `httpMock.verify()` echoue en pointant vers la version plutot que vers ce
  que le test verifiait.

## Bascule d'offre au terme

- **La bascule se voit dans la liste**, en bleu et distincte de l'offre en cours : c'est une
  decision **deja prise mais sans effet**. Invisible, on la reprogrammerait ou on s'etonnerait au
  renouvellement.
- **Aucune date n'est envoyee au serveur** : c'est lui qui sait quand la couverture s'arrete, et
  elle bouge si le client paie une prolongation. La figer cote client la ferait diverger au premier
  reglement.
- **L'ecran explique pourquoi c'est au terme** — un prorata, sinon — et dit que la bascule suit le
  nouveau terme en cas de prolongation. Sans ca, on croirait a un oubli en voyant la date changer.
- **Programmer et annuler s'excluent a l'ecran** : quand une bascule existe, on ne propose que de
  l'annuler. Deux formulaires cote a cote laisseraient croire qu'on peut en empiler plusieurs.

## L'offre sur la fiche d'abonnement

- **« Aucune offre rattachée » se voit, en ambre.** Ce n'est pas une anomalie — c'est un client
  d'avant la grille tarifaire — mais sans cette mention il y resterait pour toujours : le piege du
  champ reglable nulle part, que ce projet a deja paye deux fois.
- **Le rattachement propose la grille du jour.** Une offre terminee n'y figure pas, alors que le
  serveur l'accepterait : c'est assume — l'ecran sert a rattacher le tarif courant, et constater
  qu'un client est reste sur un ancien passe par l'API. Le jour ou le cas devient courant, il faudra
  une case « voir les offres terminees ».
- **L'ecran dit que le palier et la periodicite sont recopies** au moment du rattachement : sans
  cette phrase, on croirait qu'une revalorisation de l'offre suivra l'abonnement.
- **Sans la grille, seul le rattachement est indisponible** : le reste de l'ecran continue de
  fonctionner.

## Offres (`offers/`) : la grille tarifaire

Ce qu'on vend. **Le palier de droits n'est pas l'offre** : « Solo mensuel » et « Solo annuel »
ouvrent les memes droits et se paient differemment — l'ecran affiche donc les deux, le palier et
le prix.

- **Trois montants derives sont affiches, et ce n'est pas du confort** : une grille ou l'on ne voit
  que le prix par periode n'est pas comparable — 49 000 par an et 4 900 par mois se ressemblent a
  l'oeil. L'ecran montre l'equivalent mensuel reel, le tarif mensuel implicite (mois offerts
  deduits, pour verifier la coherence de l'annuelle), et le cout de la premiere annee installation
  comprise. Tous **calcules cote serveur**.
- **« 2 mois offerts » s'affiche avec sa traduction** : « soit 4 900 XPF/mois sur 10 mois payes ».
  Sans elle, on ne sait pas si le prix annuel saisi correspond vraiment a l'offre mensuelle.
- **Le champ « mois offerts » n'apparait que sur une offre annuelle**, et une valeur restee d'une
  saisie precedente n'est jamais envoyee sur une mensuelle — le serveur la refuserait.
- **Piege Angular rencontre** : `freeMonthsApply` lisait `form.controls.x.value` dans un
  `computed()`. Un `computed` ne suit que des **signaux** : le calcul ne se reevaluait jamais et le
  champ ne serait **jamais** apparu. Corrige avec `toSignal(valueChanges)`, et trouve par un test,
  pas a l'oeil.
- **La grille se lit a une date**, et l'ecran le dit en rouge quand ce n'est pas aujourd'hui : sans
  ce rappel, on modifierait un tarif a partir d'une lecture fausse. Meme regle que la grille fiscale,
  y compris le retour a aujourd'hui qui n'envoie **aucun** parametre.
- **L'ecran dit franchement ce que la grille ne fait pas encore** : rien ne la consomme
  automatiquement. Sans cette phrase, on croirait qu'editer une offre change quelque chose pour les
  clients.

## Journal d'administration (`audit/`)

Ce que le backoffice a fait, quand, et par qui. **La dette a ete contractee par le backoffice
lui-meme** : tant qu'il ne servait qu'a saisir des taux, ne rien tracer se defendait ; il peut
desormais accorder un acces a toutes les donnees clientes et reparer des comptes.

- **Ce qui touche a l'acces se distingue du reste** — c'est la seule question qu'on se pose devant
  un incident (« qu'a-t-on touche a l'acces ? »), et un journal tout gris obligerait a lire chaque
  ligne pour la trouver. Le filtre porte donc sur la **famille**, pas sur l'action : la question ne
  se pose pas action par action.
- **Revenir a « Tout » n'envoie pas le mot « tout », mais aucun filtre** — meme convention que la
  date de la grille fiscale : un filtre absent ne filtre pas, et c'est le serveur qui decide.
- **Le sujet et le detail sont figes cote serveur**, jamais recalcules : ils disent le nom du jour
  du geste, et c'est precisement quand un nom a change qu'on vient relire le journal.
- **Aucune ecriture n'est possible**, et l'API n'en offre aucune : le journal est alimente par les
  services qui tracent leurs propres gestes.
- **Sans les familles, seul le filtre disparait** : le journal reste lisible. Une panne partielle ne
  doit pas emporter l'ecran.

## Support des comptes clients (`organizations/organization-users/`)

Le panneau est **sur la fiche de l'organisation**, pas sur un ecran autonome : c'est la qu'on
arrive quand un client appelle, et un ecran « comptes » separe obligerait a retrouver l'entreprise
deux fois.

- **Le diagnostic est la fonctionnalite, pas la liste.** L'appel commence par « ca ne marche
  plus » : chaque ligne dit *pourquoi* la personne entre ou n'entre pas. Sans lui, on aurait
  remplace « je ne peux pas voir » par « je vois, et je ne comprends pas ».
- **Trois etats, trois lectures** : ce qui bloque (rouge), ce qui se reglera **tout seul** a la
  prochaine connexion (ambre — un compte neuf se rattache par email verifie), et ce qui va bien.
  Peindre le second en rouge ferait intervenir la ou il n'y a rien a faire.
- **« Detacher l'identite » n'apparait que la ou il y en a une.** Sur un compte non rattache, ce
  bouton ne ferait rien tout en ayant l'air d'agir — pire qu'un bouton absent, on croirait avoir
  repare.
- **Les deux gestes dont l'effet n'est pas devinable sont expliques sur la page** : detacher ne
  pose aucune identite, il en retire une ; corriger l'adresse n'ouvre d'acces a personne tant que
  la personne ne l'a pas verifiee chez le fournisseur. Sans ces lignes, on n'ose ni l'un ni
  l'autre.
- **L'adresse est normalisee a la saisie.** Une adresse se **colle** plus souvent qu'elle ne se
  tape, et `Validators.email` refuse une valeur entouree d'espaces : le bouton restait desactive
  sans que rien n'explique pourquoi — le pire des refus, celui qui ne se dit pas. Trouve par un
  test, pas a l'ecran.
- **Les libelles de roles sont recopies du frontoffice**, pas partages : les deux applications sont
  deliberement sans code commun. Le prix est cette table ; le benefice est qu'aucun point de
  couplage n'existe entre le monde client et le monde plateforme.
- **Le refus du serveur s'affiche tel quel** : lui seul sait qu'on s'apprete a retirer le dernier
  proprietaire actif, ou qu'une adresse est deja prise.

## Organisations et salons (`organizations/`, `salons/`) : acces cross-tenant, pas un referentiel global

Contrairement a `tax/`, ces deux features touchent des donnees **possedees** par une organisation
cliente — le backoffice y a acces sans filtre de tenant, ce qu'aucun ecran du frontend tenant ne
permet. Choix a connaitre :

- **Pas d'ecran de creation d'organisation.** `organization.service.ts` n'expose que
  `list`/`get`/`update` : une organisation sans utilisateur rattache serait inutilisable, et la
  gestion des comptes n'est pas (encore) dans ce backoffice. Les salons, eux, se creent
  entierement ici (`salon-form/` en mode creation choisit l'organisation dans un `mat-select`,
  liste chargee via `MAX_PAGE_SIZE` — a transformer en autocomplete si le nombre de clients
  grossit).
- **Un salon ne change pas d'organisation apres sa creation** : `salon-form/` l'affiche en lecture
  seule des qu'on est en edition (voir `SalonAdminUpdateRequest` cote backend, qui n'a pas
  d'`organizationId`).
- **La case "Actif" d'une organisation a un effet reel**, pas seulement cosmetique : desactiver
  bloque immediatement la connexion de tous ses utilisateurs, jetons deja emis compris (voir
  `../backend/CLAUDE.md`, section backoffice plateforme). Le formulaire le rappelle explicitement
  plutot que de laisser une case a cocher sans consequence apparente.
- **Le filtre par organisation de `salon-list/`** et le selecteur d'organisation de `salon-form/`
  partagent le meme `OrganizationService.list()` — pas de duplication d'un appel `/api/v1/platform/organizations`
  specifique a chaque ecran.

## Tests

Memes conventions que `frontend/` : tests unitaires co-localises (`*.spec.ts`), nommage
descriptif en anglais, Vitest via `@angular/build:unit-test`. Les listes paginees avec recherche
debouncee (`organization-list/`, `salon-list/`) suivent le meme motif que `product-list` cote
tenant pour tester le debounce : `vi.useFakeTimers()` installe **avant** la frappe, puis
`vi.advanceTimersByTime(300)` — le projet tourne sans Zone.js, `fakeAsync`/`tick` ne sont pas
disponibles.

## Lancer en local

Voir `README.md`.

## Deploiement : conteneur nginx, comme les deux autres depots

Le backoffice etait deploye **par SSH sur un VPS**, avec `scp` et un service systemd, quand le
frontend et le backend etaient passes en conteneurs sur Scaleway. Trois chaines differentes pour un
meme produit, dont une seule connue de la moitie de l'equipe.

Il suit desormais exactement le meme chemin : image nginx *unprivileged*, poussee au registre
Scaleway avec le SHA pour seule etiquette, conteneur mis a jour par la CI. `develop` livre staging,
`main` livre la production — cette branche `develop` n'existait pas ici, ce qui rendait toute
livraison de qualification impossible.

**Ce qui est copie du frontend, et pourquoi** : le gabarit nginx. Les pieges qui y sont documentes
valent ici a l'identique, et les redecouvrir un par un couterait le temps qu'ils ont deja coute une
fois — l'accolade de `{8}` qui empeche nginx de demarrer, le `nginx -t` qui valide la mauvaise
configuration et repond « syntax is ok », l'`immutable` pose par erreur sur des fichiers a nom
stable, `Origin` qu'il ne faut pas supprimer.

**Ce qui lui est propre** : sa **propre** cle API IAM (`sillage-backoffice-proxy`), et non celle du
frontend. Partager une cle rendrait impossible de la revoquer d'un cote sans couper l'autre.

**Variables a poser sur le conteneur** : `BACKEND_URL` (ordinaire) et `BACKEND_TOKEN` (**secrete**).
Sans la seconde, `envsubst` laisse l'en-tete vide et tous les appels API tombent en **403 au corps
vide** — c'est la passerelle qui repond, pas Spring : le corps vide est le signe distinctif.

## La version d'API : ce depot etait entierement hors service

Tous les appels visaient `/api/platform/...` quand le backend sert `/api/v1/platform/...` depuis le
versionnement. **Aucun ecran ne fonctionnait**, et rien ne le disait autrement que par des 404 —
pas une erreur parlante, une avalanche silencieuse sur toutes les pages a la fois.

`core/api.ts` porte desormais le prefixe, seul endroit ou la version s'ecrit, miroir de
`nc.sillage.shared.ApiVersion` et de la constante du meme nom cote frontend. **Les trois doivent
bouger ensemble.** Les specs, elles, ecrivent le chemin complet en dur : elles verifient le contrat
reellement envoye sur le fil, et une montee de version doit les faire echouer toutes d'un coup
plutot que de passer inapercue.

## Authentification : externalisee, comme l'application des salons

Le backoffice n'authentifie plus personne. Il se connectait par mot de passe contre
`platform_admins.password_hash` — colonne supprimee par la migration V46 : l'ecran appelait un
endpoint qui n'existait plus, et **rien ne le disait**.

`/login` ne porte plus de formulaire : il **redirige** vers le backend, qui echange le code contre
un jeton **avec son secret** et nous renvoie sur `/callback`.

- **Une seconde application chez le fournisseur**, distincte de celle des salons. C'est l'audience
  qui empeche un jeton de gerante d'ouvrir ce backoffice, et elle n'est distincte que si les
  applications le sont.
- **Le jeton arrive dans le fragment** (`#access_token=…`), jamais en parametre de requete : un
  fragment n'est pas transmis au serveur, donc absent des journaux d'acces et de l'en-tete
  `Referer`. Il est retire de la barre d'adresse par `replaceState` — jamais `pushState`, sinon un
  retour arriere y ramenerait.
- **Cle `sillage-backoffice.token`**, et surtout plus `kaimana-backoffice.token` : les anciens
  jetons etaient signes par Sillage et sont desormais refuses. Changer de cle evite qu'un navigateur
  deja ouvert reparte avec l'un d'eux, rejete a chaque requete sans que rien ne l'explique.
- **Un `403` sur `/me` n'est pas une panne mais un signal** : authentifie chez le fournisseur,
  absent de `platform_admins`. Le rattachement y est **manuel** — on ne devient pas administrateur
  plateforme en se connectant — donc le jeton est **conserve** et l'ecran le dit, au lieu de boucler
  sur une reconnexion qui redonnerait toujours le meme resultat. Un `401`, lui, efface.
- **`/callback` n'a aucune garde**, deliberement : `guestGuard` renverrait a l'accueil quiconque se
  reconnecte, `authGuard` refuserait tout le monde puisqu'on n'a precisement pas encore de session.
- **`/login` ne redirige pas tout seul** : la redirection automatique rend l'arrivee indistinguable
  d'une panne — le fournisseur reconnait sa session et renvoie aussitot, si bien qu'on traverse deux
  redirections sans jamais rien voir, et sans pouvoir choisir un autre compte.
- **La deconnexion ne navigue pas** : elle revoque le jeton puis **quitte l'application** pour aller
  fermer la session chez le fournisseur, qui nous ramene sur `/logout`. Naviguer en plus ferait
  partir deux fois, et la seconde annulerait la premiere.
- **L'intercepteur ne reagit qu'au `401`**, jamais au `403`, et jamais sur les routes
  d'authentification elles-memes : c'est `/me` qui **etablit** la session, reagir a son 401
  relancerait une connexion au moment ou l'on est en train d'en juger.
