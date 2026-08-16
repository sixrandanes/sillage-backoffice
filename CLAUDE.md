# Kaimana backoffice

Backoffice interne a l'equipe Kaimana — pas l'application des clients (voir
`../frontend/CLAUDE.md`, l'app tenant). Angular 21, meme stack technique que `frontend/`
(Material, Vitest, standalone components, signals), mais **projet, repo et modele de securite
completement separes**. Ne jamais partager de code entre les deux (voir plus bas, "Pourquoi un
projet separe").

En cas de doute sur une regle metier (fiscalite, RBAC, cycle de vie d'une donnee), se referer a
`../backend/CLAUDE.md`, qui reste la source de verite metier — en particulier sa section
"Backoffice plateforme (`nc.kaimana.platform`)", qui documente le cloisonnement cote serveur que
ce projet consomme.

## Pourquoi un projet separe, pas un ecran de plus dans `frontend/`

Un compte du backoffice (`PLATFORM_ADMIN`) traverse toutes les organisations clientes — ce n'est
pas un role de plus dans le RBAC tenant (`ORG_OWNER`/`SALON_{id}_{ROLE}`), c'est un modele
d'identite different, sans lien avec `Organization`/`AppUser`. Le melanger dans le meme bundle
Angular que celui livre aux clients aurait expose du code et des routes d'administration interne
sur la meme surface que l'app front-office. D'ou trois projets independants
(`kaimana-backend`, `kaimana-frontend`, `kaimana-backoffice`), chacun son propre repo, dans un
dossier parent non versionne (`~/Documents/kaimana/`).

## Authentification : jeton et session propres, pas ceux du frontend tenant

`core/auth/` reproduit le pattern eprouve de `frontend/src/app/core/auth/` (signal `currentAdmin`,
garde fonctionnelle, intercepteur fonctionnel) — **sans en partager le code** : un jeton emis par
`POST /api/auth/login` (tenant) n'authentifie jamais une requete `/api/platform/**`, et
reciproquement (voir `nc.kaimana.identity.SecurityConfig` cote backend, deux chaines de securite
etanches). Reproduire le pattern plutot que le partager evite justement de creer un point de
couplage entre les deux mondes qu'on cherche a isoler.

Differences notables avec le pattern tenant :

- Stockage localStorage sous des cles differentes (`kaimana-backoffice.token` /
  `kaimana-backoffice.admin`), pour ne jamais collisionner avec celles du frontend tenant si les
  deux apps tournent sur le meme navigateur (ports differents, mais autant eviter toute ambiguite).
- **Pas d'endpoint `/me`** cote backoffice : la session se restaure directement depuis ce que
  `/api/platform/auth/login` a deja renvoye (mis de cote en localStorage), pas via un aller-retour
  reseau au demarrage. Consequence assumee : un jeton expire entre deux sessions ne se decouvre
  qu'a la premiere requete protegee, geree par `auth.interceptor.ts` (401 -> deconnexion +
  redirection `/login`), pas au chargement de la page.
- **Pas d'inscription en libre-service.** Le nombre de comptes est volontairement tres restreint
  (voir `../backend/README.md` pour la procedure de creation manuelle) : il n'y a donc pas
  d'ecran `/signup` a construire ici.

## Fiscalite (`tax/`) : consomme `/api/platform/tax`, jamais `/api/tax`

`TaxService` (`tax/tax.service.ts`) parle exclusivement a `/api/platform/tax/**` — le referentiel
tenant en lecture seule (`/api/tax/**`, consomme par `frontend/`) vit derriere la chaine de
securite tenant et rejette un jeton plateforme (voir cloisonnement plus haut). Les deux services
ne sont donc pas interchangeables malgre des formes de donnees proches.

`tax-page/` programme un nouveau taux (categorie, valeur, libelle, date d'effet) par regime :
c'est la seule ecriture possible sur le referentiel fiscal, jamais une edition ou une suppression
d'un taux historique (voir `TaxAdminService` cote backend, meme principe d'inalterabilite que le
reste de Kaimana). Le formulaire ne propose que les categories actuellement ouvertes du regime
(`panel.info.rates`) : programmer un taux pour une categorie fermee echouerait cote backend
(409 CONFLICT), inutile de laisser l'utilisateur y arriver.

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
  partagent le meme `OrganizationService.list()` — pas de duplication d'un appel `/api/platform/organizations`
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
