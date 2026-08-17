import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { SubscriptionOptions } from '../subscriptions/models';
import { Offer, OfferRequest } from './models';

@Injectable({ providedIn: 'root' })
export class OfferService {
  private readonly http = inject(HttpClient);

  private readonly base = `${API}/platform/offers`;

  /**
   * La grille à une date.
   *
   * Sans date, on n'envoie **aucun** paramètre : c'est le serveur qui sait quel jour il est. Même
   * convention que la grille fiscale.
   */
  list(on: string | null): Observable<Offer[]> {
    const params = on ? new HttpParams().set('on', on) : undefined;
    return this.http.get<Offer[]>(this.base, { params });
  }

  options(): Observable<SubscriptionOptions> {
    return this.http.get<SubscriptionOptions>(`${this.base}/options`);
  }

  create(request: OfferRequest): Observable<Offer> {
    return this.http.post<Offer>(this.base, request);
  }

  update(id: number, request: OfferRequest): Observable<Offer> {
    return this.http.put<Offer>(`${this.base}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
