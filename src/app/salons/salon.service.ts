import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageQuery, PageResponse } from '../core/http/page';
import { SalonAdmin, SalonAdminCreateRequest, SalonAdminUpdateRequest } from './models';

export interface SalonQuery extends PageQuery {
  organizationId?: number;
}

@Injectable({ providedIn: 'root' })
export class SalonService {
  private readonly http = inject(HttpClient);

  list(query: SalonQuery): Observable<PageResponse<SalonAdmin>> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 25);
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.organizationId) {
      params = params.set('organizationId', query.organizationId);
    }
    return this.http.get<PageResponse<SalonAdmin>>('/api/platform/salons', { params });
  }

  get(id: number): Observable<SalonAdmin> {
    return this.http.get<SalonAdmin>(`/api/platform/salons/${id}`);
  }

  create(request: SalonAdminCreateRequest): Observable<SalonAdmin> {
    return this.http.post<SalonAdmin>('/api/platform/salons', request);
  }

  update(id: number, request: SalonAdminUpdateRequest): Observable<SalonAdmin> {
    return this.http.put<SalonAdmin>(`/api/platform/salons/${id}`, request);
  }
}
