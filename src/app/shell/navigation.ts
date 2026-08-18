/**
 * Les rubriques du backoffice, et ce qu'elles contiennent.
 *
 * <p><b>Pourquoi des rubriques.</b> Les huit ecrans etaient a plat dans le bandeau, dans un ordre
 * qui ne disait rien : « Abonnements, Offres, Organisations, Salons, Taxes, Administrateurs,
 * Journal ». Rien ne permettait de prevoir ou chercher, et le prochain ecran ajoute aurait allonge
 * la liste d'un cran de plus. Une rubrique doit <b>reduire la recherche</b> — c'est la lecon du menu
 * du frontoffice, ou « Gestion » couvrait sept entrees sur onze et ne permettait donc de rien
 * prevoir.
 *
 * <p><b>Le decoupage suit ce dont on parle</b>, pas la nature technique de l'ecran :
 * ce qu'on vend, les clients qui l'achetent, le referentiel qui s'applique a tous, et nous.
 *
 * <p><b>Cette liste est la source</b>, pas le gabarit. Recopiee dans le HTML, elle aurait ete
 * inverifiable : `shell.spec.ts` epingle ici que tout ecran de premier niveau figure au menu une
 * fois et une seule — l'invariant que le frontoffice s'est donne apres avoir laisse six entrees
 * sans icone et dix-sept ecrans afficher une rubrique abandonnee.
 */
export interface NavEntry {
  readonly label: string;
  readonly route: string;
}

export interface NavSection {
  readonly label: string;
  readonly entries: readonly NavEntry[];
}

export const NAVIGATION: readonly NavSection[] = [
  {
    // En tete parce que c'est l'accueil : on y arrive pour savoir quoi faire, et il renvoie vers
    // les ecrans qui portent les listes. Meme vocabulaire que le frontoffice, ou « Pilotage »
    // designe deja ce qui se regarde plutot que ce qui se fait.
    label: 'Pilotage',
    entries: [
      { label: 'Tableau de bord', route: '/overview' },
      // Ce qui se regarde quand quelque chose ne marche pas : meme rubrique, autre question.
      { label: 'Services extérieurs', route: '/dependencies' },
    ],
  },
  {
    // En premier parce que c'est la seule rubrique ou **l'inaction se paie** : une echeance manquee
    // ferme la caisse d'un client. Les autres attendent sans consequence.
    label: 'Commercial',
    entries: [
      { label: 'Abonnements', route: '/subscriptions' },
      { label: 'Offres', route: '/offers' },
    ],
  },
  {
    // Les entites des clients, et le support de leurs comptes. C'est ici qu'on va quand quelqu'un
    // appelle.
    label: 'Clients',
    entries: [
      { label: 'Organisations', route: '/organizations' },
      { label: 'Salons', route: '/salons' },
    ],
  },
  {
    // Ce qui s'applique a **tous** les clients et n'appartient a aucun. Les territoires d'abord :
    // on decide ou l'on vend avant de decider comment on y taxe.
    label: 'Référentiel',
    entries: [
      { label: 'Territoires', route: '/territories' },
      { label: 'Taxes', route: '/taxes' },
    ],
  },
  {
    // Nous. Des ecrans qui ne parlent ni d'un client ni d'un tarif : ce qu'on dit a tout le
    // monde, qui a acces, et qui a fait quoi. Les messages viennent en tete parce que c'est le
    // seul geste d'ici dont **tous** les clients voient le resultat.
    label: 'Plateforme',
    entries: [
      { label: 'Messages', route: '/announcements' },
      { label: 'Administrateurs', route: '/admins' },
      { label: 'Journal', route: '/audit' },
    ],
  },
];
