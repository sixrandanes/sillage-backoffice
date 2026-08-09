import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'taxes' },
      {
        path: 'taxes',
        loadComponent: () => import('./tax/tax-page/tax-page').then((m) => m.TaxPage),
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
