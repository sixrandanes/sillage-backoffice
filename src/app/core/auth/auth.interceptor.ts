import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Pose le jeton, et rattrape ce que le garde de route ne voit pas : une expiration **en cours
 * d'ecran**, ou une revocation faite ailleurs.
 *
 * <p><b>`401` seulement, jamais `403`.</b> Un 401 dit « je ne sais pas qui vous etes » — le jeton
 * est en cause. Un 403 dit « je sais qui vous etes, et c'est non » : ici, cela signifie
 * authentifie chez le fournisseur mais absent de `platform_admins`. Reconnecter sur un 403
 * bouclerait a l'infini, puisque la reconnexion redonnerait exactement le meme resultat.
 *
 * <p><b>Reconnecter n'est pas se deconnecter</b> : une echeance ne doit pas fermer la session du
 * fournisseur. On repart chercher un jeton en revenant sur la meme page, et le fournisseur
 * reconnait sa propre session — l'aller-retour est invisible.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (!req.url.startsWith('/api')) {
    return next(req);
  }

  const token = auth.token;
  const authorized = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      // Les routes d'authentification sont exclues : c'est `/me` qui **etablit** la session, et
      // reagir a son 401 relancerait une connexion au moment ou l'on est en train d'en juger.
      const authentification = req.url.includes('/platform/auth/');
      if (error instanceof HttpErrorResponse && error.status === 401 && !authentification) {
        auth.reauthenticate(window.location.pathname);
      }
      return throwError(() => error);
    }),
  );
};
