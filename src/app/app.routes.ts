import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    // La deconnexion a son **adresse propre** plutot qu'un parametre : c'est elle qu'on declare
    // chez le fournisseur comme URL de retour, et l'ecran doit alors proposer une reconnexion
    // explicite au lieu d'y renvoyer aussitot.
    path: 'logout',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    data: { signedOut: true },
  },
  {
    // **Aucune garde** : `guestGuard` renverrait a l'accueil quiconque se reconnecte, et
    // `authGuard` refuserait tout le monde puisqu'on n'a precisement pas encore de session.
    path: 'callback',
    loadComponent: () => import('./callback/callback').then((m) => m.Callback),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    children: [
      // L'accueil est l'etat des lieux des abonnements : c'est la seule page ou une inaction se
      // paie — la caisse d'un client se ferme. Les taxes, elles, attendent une annonce officielle.
      // **L'accueil est le tableau de bord.** Les abonnements l'etaient « parce que c'est la seule
      // page ou l'inaction se paie » — le raisonnement reste juste, mais ce tableau porte desormais
      // ce constat *et* le reste, et il y renvoie plutot que de le remplacer.
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./overview/overview-page/overview-page').then((m) => m.OverviewPage),
      },
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./subscriptions/subscription-page/subscription-page').then((m) => m.SubscriptionPage),
      },
      {
        // Avant les taxes, dans la rubrique « Référentiel » : on décide d'abord **où** l'on vend,
        // ensuite comment on y taxe. C'était un panneau dans l'écran des taxes, ce qui rangeait le
        // territoire sous une de ses conséquences — voir `territory-page`.
        path: 'territories',
        loadComponent: () =>
          import('./territories/territory-page/territory-page').then((m) => m.TerritoryPage),
      },
      {
        path: 'taxes',
        loadComponent: () => import('./tax/tax-page/tax-page').then((m) => m.TaxPage),
      },
      {
        path: 'offers',
        loadComponent: () => import('./offers/offer-page/offer-page').then((m) => m.OfferPage),
      },
      {
        path: 'audit',
        loadComponent: () => import('./audit/audit-page/audit-page').then((m) => m.AuditPage),
      },
      {
        path: 'admins',
        loadComponent: () => import('./admins/admin-page/admin-page').then((m) => m.AdminPage),
      },
      {
        path: 'organizations',
        loadComponent: () =>
          import('./organizations/organization-list/organization-list').then((m) => m.OrganizationList),
      },
      {
        path: 'organizations/:id',
        loadComponent: () =>
          import('./organizations/organization-form/organization-form').then((m) => m.OrganizationForm),
      },
      {
        path: 'salons',
        loadComponent: () => import('./salons/salon-list/salon-list').then((m) => m.SalonList),
      },
      {
        path: 'salons/new',
        loadComponent: () => import('./salons/salon-form/salon-form').then((m) => m.SalonForm),
      },
      {
        path: 'salons/:id',
        loadComponent: () => import('./salons/salon-form/salon-form').then((m) => m.SalonForm),
      },
    ],
  },
];
