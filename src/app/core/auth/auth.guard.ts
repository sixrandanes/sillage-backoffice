import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Aucune session : on renvoie sur `/login`, qui propose une connexion explicite.
 *
 * <p><b>Il n'y a plus d'echeance a inspecter ici</b>, et c'est une consequence directe du passage
 * au cookie : le navigateur ne detient plus de jeton, donc plus rien a lire. La session est etablie
 * au demarrage par `/me` (voir `provideAppInitializer`), et une expiration survenue **pendant**
 * l'ecran se rattrape ou elle se manifeste — sur le `401` que l'intercepteur intercepte. Une
 * verification locale ne pouvait de toute facon jamais faire mieux que le serveur.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnTo: state.url } });
  }
  return true;
};

/** Empeche d'afficher /login a un administrateur deja connecte. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
