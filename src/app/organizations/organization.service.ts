import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PageQuery, PageResponse } from '../core/http/page';
import { OrganizationAdmin, OrganizationAdminUpdateRequest } from './models';
import { API } from '../core/api';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);

  list(query: PageQuery): Observable<PageResponse<OrganizationAdmin>> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 25);
    if (query.search) {
      params = params.set('search', query.search);
    }
    return this.http.get<PageResponse<OrganizationAdmin>>(`${API}/platform/organizations`, { params });
  }

  get(id: number): Observable<OrganizationAdmin> {
    return this.http.get<OrganizationAdmin>(`${API}/platform/organizations/${id}`);
  }

  update(id: number, request: OrganizationAdminUpdateRequest): Observable<OrganizationAdmin> {
    return this.http.put<OrganizationAdmin>(`${API}/platform/organizations/${id}`, request);
  }
}
