import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ScheduleRateRequest, TaxRateInfo, TaxRegime, TaxRegimeInfo } from './models';

/**
 * Version admin du referentiel fiscal (nc.kaimana.tax.TaxAdminController cote backend),
 * separee du TaxService "lecture seule" du frontend tenant : celui-ci vit sous /api/tax et
 * sur la chaine de securite tenant, inaccessible avec un jeton plateforme (voir SecurityConfig
 * cote backend). Ce service parle exclusivement a /api/platform/tax.
 */
@Injectable({ providedIn: 'root' })
export class TaxService {
  private readonly http = inject(HttpClient);

  regimes(): Observable<TaxRegimeInfo[]> {
    return this.http.get<TaxRegimeInfo[]>('/api/platform/tax/regimes');
  }

  history(regime: TaxRegime): Observable<TaxRateInfo[]> {
    return this.http.get<TaxRateInfo[]>(`/api/platform/tax/regimes/${regime}/history`);
  }

  scheduleRate(regime: TaxRegime, request: ScheduleRateRequest): Observable<TaxRateInfo> {
    return this.http.post<TaxRateInfo>(`/api/platform/tax/regimes/${regime}/rates`, request);
  }
}
