import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { DependencyHealth } from './models';

/**
 * L'état des services extérieurs.
 *
 * **Aucune sonde active**, et c'est le choix structurant : interroger EPayNC pour savoir s'il
 * répond supposerait d'émettre un paiement, et une sonde synthétique mesure le chemin de la sonde,
 * pas celui qu'empruntent les salons. Le serveur lit le **trafic réel** — donc ce que les clients
 * vivent, au prix assumé de ne rien pouvoir dire quand personne n'appelle.
 */
@Injectable({ providedIn: 'root' })
export class DependenciesService {
  private readonly http = inject(HttpClient);

  health(days = 7): Observable<DependencyHealth> {
    const params = new HttpParams().set('days', days);
    return this.http.get<DependencyHealth>(`${API}/platform/dependencies`, { params });
  }
}
