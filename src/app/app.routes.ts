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
      { path: '', pathMatch: 'full', redirectTo: 'subscriptions' },
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./subscriptions/subscription-page/subscription-page').then((m) => m.SubscriptionPage),
      },
      {
        path: 'taxes',
        loadComponent: () => import('./tax/tax-page/tax-page').then((m) => m.TaxPage),
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
