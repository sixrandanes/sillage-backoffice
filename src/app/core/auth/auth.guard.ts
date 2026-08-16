import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Deux refus distincts, a ne pas confondre.
 *
 * <ul>
 *   <li><b>Aucune session</b> — on renvoie sur `/login`, qui propose une connexion explicite.</li>
 *   <li><b>Une session dont le jeton a expire</b> pendant que l'application etait ouverte — on
 *       repart en chercher un neuf. Sans ce second cas, on laisserait naviguer normalement puis
 *       chaque appel echouerait : l'ecran se remplirait d'erreurs sans que rien n'explique
 *       pourquoi, et on conclurait que le produit est casse.</li>
 * </ul>
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnTo: state.url } });
  }
  if (auth.isTokenExpired()) {
    auth.reauthenticate(state.url);
    return false;
  }
  return true;
};

/** Empeche d'afficher /login a un administrateur deja connecte. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
