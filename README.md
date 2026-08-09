# Kaimana backoffice

Backoffice interne reserve a l'equipe Kaimana (pas aux clients/salons). Angular 21, meme stack
que [`kaimana-frontend`](https://github.com/sixrandanes/kaimana-frontend) (Material, Vitest),
mais authentification et modele de securite **completement separes** du modele tenant — voir
`../backend/CLAUDE.md`, section "Backoffice plateforme".

Premiere fonctionnalite : programmer une evolution des taux de taxe (TGC/TVA), sans passer par
une migration Flyway a chaque annonce officielle de la DSF/DICP.

## Prerequis

- Node.js 22, npm 10
- Le backend (`../backend`) doit tourner en local (`docker-compose up -d` puis
  `./mvnw spring-boot:run`, voir `../backend/README.md`) pour que le proxy `/api` fonctionne.

## Premier compte

Il n'y a pas d'inscription en libre-service. Voir `../backend/README.md`, section "Backoffice
plateforme", pour creer le premier compte admin (insertion SQL documentee, une seule fois).

## Lancer en local

```bash
npm install
ng serve   # http://localhost:4300 (le frontend tenant occupe deja 4200), proxy /api -> backend local
ng test    # tests unitaires (Vitest)
ng build   # build de prod dans dist/
```

## Messages de commit : Conventional Commits

Meme convention que les deux autres depots : `type(scope): description`, scope obligatoire
(`auth`, `tax`, `shell`, `core`, ou `config`/`build` pour l'outillage transverse). Types : `feat`,
`fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`/`ci`. Description courte a
l'imperatif, sans majuscule ni point final.
