import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { API } from '../api';
import { AuthService } from './auth.service';

/**
 * Les seules routes que ce backoffice a le droit d'autoriser.
 *
 * <p><b>Un jeton plateforme n'a rien a faire sur une route tenant</b>, et l'y envoyer ne le rendait
 * pas seulement inutile : la chaine tenant valide tout jeton **present**, meme sur une route
 * ouverte, et rejette celui-ci en `401` faute d'audience. Le pied de page des versions, qui lit
 * `/api/v1/version`, a suffi a faire boucler l'application entiere — 401 non reconnu, reconnexion,
 * retour, 401.
 *
 * <p><b>Le defaut etait invisible au `curl`</b> : sans jeton, la meme route repond `200`. Il ne se
 * manifeste que connecte, exactement comme la panne CORS documentee cote backend, ou sept
 * verifications passaient au vert sur un site hors service.
 */
const PLATFORM_PREFIX = `${API}/platform/`;

/**
 * Rattrape ce que le garde de route ne voit pas : une expiration **en cours d'ecran**, ou une
 * revocation faite ailleurs.
 *
 * <p><b>Il ne pose plus de jeton</b> : depuis le passage au cookie `HttpOnly`, le navigateur n'en
 * detient aucun et le cookie voyage tout seul. C'est aussi ce qui rend la boucle d'antan
 * impossible — il n'y a plus rien a envoyer au mauvais endroit.
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

  // Seules les routes plateforme portent le jeton. Une route tenant appelee d'ici — la version du
  // serveur, par exemple — part **sans** en-tete : elle est ouverte, et lui en donner un la ferait
  // refuser.
  if (!req.url.startsWith(PLATFORM_PREFIX)) {
    return next(req);
  }

  // `withCredentials` est explicite alors que l'API est servie en meme origine, ou le cookie part
  // de toute facon : ecrit noir sur blanc, il dit que cette requete **depend** du cookie, et il
  // continuerait de fonctionner si l'API venait a etre servie ailleurs.
  const avecSession = req.clone({ withCredentials: true });

  return next(avecSession).pipe(
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
