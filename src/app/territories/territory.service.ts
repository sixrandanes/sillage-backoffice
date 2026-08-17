import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { Territory } from '../tax/models';
import { TerritoryView } from './models';

@Injectable({ providedIn: 'root' })
export class TerritoryService {
  private readonly http = inject(HttpClient);

  private readonly base = `${API}/platform/territories`;

  list(): Observable<TerritoryView[]> {
    return this.http.get<TerritoryView[]>(this.base);
  }

  setOpen(regime: Territory, open: boolean): Observable<TerritoryView> {
    return this.http.post<TerritoryView>(`${this.base}/${regime}`, { open });
  }
}
