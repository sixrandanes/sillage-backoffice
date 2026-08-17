import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { API } from './api';

export interface Version {
  commit: string;
  builtAt: string | null;
}

/**
 * « Qu'est-ce qui tourne réellement ? » — la question qui précède toutes les autres.
 *
 * Le besoin n'est pas théorique : plusieurs échanges ont été perdus, côté frontend, à diagnostiquer
 * un écran qui n'était pas celui en ligne, la CI n'ayant pas livré. Les deux conteneurs se
 * déploient séparément, donc les deux versions se lisent séparément.
 */
@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly http = inject(HttpClient);

  /**
   * La version de ce backoffice, gravée dans le bundle au build.
   *
   * Servie `no-store` par nginx : une réponse mise en cache mentirait exactement au moment où l'on
   * a besoin qu'elle dise vrai.
   */
  backoffice(): Observable<Version> {
    return this.http.get<Version>('/version.json').pipe(catchError(() => of(inconnue())));
  }

  /**
   * La version du serveur, à travers la passerelle.
   *
   * Route ouverte sans authentification côté backend, précisément parce qu'elle sert quand plus
   * rien ne fonctionne — elle ne divulgue qu'un SHA de commit.
   */
  backend(): Observable<Version> {
    return this.http.get<Version>(`${API}/version`).pipe(catchError(() => of(inconnue())));
  }
}

/**
 * Un échec se dit, il ne se cache pas.
 *
 * Masquer la ligne en cas d'erreur ferait disparaître l'information au moment où elle compte : ne
 * pas pouvoir lire la version du serveur **est** un diagnostic.
 */
function inconnue(): Version {
  return { commit: 'inconnue', builtAt: null };
}
