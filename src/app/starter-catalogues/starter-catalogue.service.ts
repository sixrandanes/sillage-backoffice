import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { StarterActivity, StarterServiceRequest } from './models';

@Injectable({ providedIn: 'root' })
export class StarterCatalogueService {
  private readonly http = inject(HttpClient);

  private readonly base = `${API}/platform/starter-catalogues`;

  list(): Observable<StarterActivity[]> {
    return this.http.get<StarterActivity[]>(this.base);
  }

  createActivity(label: string): Observable<StarterActivity> {
    return this.http.post<StarterActivity>(this.base, { label });
  }

  renameActivity(id: number, label: string): Observable<StarterActivity> {
    return this.http.put<StarterActivity>(`${this.base}/${id}`, { label });
  }

  deleteActivity(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addService(activityId: number, request: StarterServiceRequest): Observable<StarterActivity> {
    return this.http.post<StarterActivity>(`${this.base}/${activityId}/services`, request);
  }

  updateService(
    activityId: number,
    serviceId: number,
    request: StarterServiceRequest,
  ): Observable<StarterActivity> {
    return this.http.put<StarterActivity>(
      `${this.base}/${activityId}/services/${serviceId}`,
      request,
    );
  }

  deleteService(activityId: number, serviceId: number): Observable<StarterActivity> {
    return this.http.delete<StarterActivity>(`${this.base}/${activityId}/services/${serviceId}`);
  }
}
