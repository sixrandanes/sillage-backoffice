import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { AnnouncementRequest, AnnouncementView } from './models';

/**
 * Les messages adressés aux salons.
 *
 * <p><b>Deux gestes seulement : rédiger et retirer.</b> Il n'existe volontairement pas de
 * modification — un message déjà affiché a été lu, en changer le texte laisserait deux versions dans
 * la nature dont une seule serait relisible. On retire, on rédige à nouveau.
 */
@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private readonly http = inject(HttpClient);

  private readonly base = `${API}/platform/announcements`;

  list(): Observable<AnnouncementView[]> {
    return this.http.get<AnnouncementView[]>(this.base);
  }

  create(request: AnnouncementRequest): Observable<AnnouncementView> {
    return this.http.post<AnnouncementView>(this.base, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
