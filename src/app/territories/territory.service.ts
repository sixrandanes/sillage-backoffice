import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { TaxRegime } from '../tax/models';
import { Territory } from './models';

@Injectable({ providedIn: 'root' })
export class TerritoryService {
  private readonly http = inject(HttpClient);

  private readonly base = `${API}/platform/territories`;

  list(): Observable<Territory[]> {
    return this.http.get<Territory[]>(this.base);
  }

  setOpen(regime: TaxRegime, open: boolean): Observable<Territory> {
    return this.http.post<Territory>(`${this.base}/${regime}`, { open });
  }
}
