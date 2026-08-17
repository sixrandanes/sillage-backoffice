import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { PageResponse } from '../core/http/page';
import { AuditActionOption, SalonAuditEntry, SalonAuditQuery } from './audit.models';

/**
 * Le journal de caisse d'un salon, en lecture seule.
 *
 * Il n'existe **aucune** route d'écriture, ni ici ni côté client : depuis le support, ce serait une
 * réécriture d'historique fiscal, précisément ce que l'inaltérabilité interdit.
 *
 * La consultation est tracée côté serveur, une fois par tranche de 24 h.
 */
@Injectable({ providedIn: 'root' })
export class SalonAuditService {
  private readonly http = inject(HttpClient);

  private base(salonId: number): string {
    return `${API}/platform/salons/${salonId}/audit`;
  }

  entries(salonId: number, query: SalonAuditQuery): Observable<PageResponse<SalonAuditEntry>> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 25);
    // Un filtre absent ne filtre pas : on n'envoie pas de valeur vide, c'est le serveur qui décide.
    if (query.action) {
      params = params.set('action', query.action);
    }
    if (query.from) {
      params = params.set('from', query.from);
    }
    if (query.to) {
      params = params.set('to', query.to);
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    return this.http.get<PageResponse<SalonAuditEntry>>(`${this.base(salonId)}/entries`, { params });
  }

  actions(salonId: number): Observable<AuditActionOption[]> {
    return this.http.get<AuditActionOption[]>(`${this.base(salonId)}/actions`);
  }
}
