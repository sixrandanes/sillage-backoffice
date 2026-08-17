import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { PlatformOverview } from './models';

@Injectable({ providedIn: 'root' })
export class OverviewService {
  private readonly http = inject(HttpClient);

  /**
   * @param days la période du **mouvement** seulement. Le stock et les rapports disent l'état du
   * moment et ne dépendent d'aucune période.
   */
  describe(days: number): Observable<PlatformOverview> {
    return this.http.get<PlatformOverview>(`${API}/platform/overview`, {
      params: { days },
    });
  }
}
