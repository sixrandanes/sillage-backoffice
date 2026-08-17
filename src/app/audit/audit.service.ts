import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { AuditEntry, AuditFamily, FamilyOption } from './models';

/**
 * Le journal d'administration, en lecture seule.
 *
 * Il n'existe **aucune** route d'écriture, et il ne doit jamais y en avoir : le journal est
 * alimenté par les services qui tracent leurs propres gestes.
 */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  private readonly base = `${API}/platform/audit`;

  journal(organizationId: number | null, family: AuditFamily | null, size: number): Observable<AuditEntry[]> {
    let params = new HttpParams().set('size', size);
    if (organizationId !== null) {
      params = params.set('organizationId', organizationId);
    }
    if (family !== null) {
      params = params.set('family', family);
    }
    return this.http.get<AuditEntry[]>(this.base, { params });
  }

  families(): Observable<FamilyOption[]> {
    return this.http.get<FamilyOption[]>(`${this.base}/families`);
  }
}
