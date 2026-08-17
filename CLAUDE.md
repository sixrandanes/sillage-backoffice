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
