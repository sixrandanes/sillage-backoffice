import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { PlatformAdmin, PlatformAdminRequest } from './models';

/**
 * Les comptes du backoffice.
 *
 * Remplace l'insertion SQL en production : c'était le dernier geste courant du produit qui n'avait
 * aucune API, et il fallait ouvrir une session sur la base de tous les clients pour écrire quatre
 * colonnes.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  private readonly base = `${API}/platform/admins`;

  list(): Observable<PlatformAdmin[]> {
    return this.http.get<PlatformAdmin[]>(this.base);
  }

  create(request: PlatformAdminRequest): Observable<PlatformAdmin> {
    return this.http.post<PlatformAdmin>(this.base, request);
  }

  update(id: number, request: PlatformAdminRequest): Observable<PlatformAdmin> {
    return this.http.put<PlatformAdmin>(`${this.base}/${id}`, request);
  }

  /** L'accès est coupé dès la requête suivante, pas à l'expiration du jeton. */
  deactivate(id: number): Observable<PlatformAdmin> {
    return this.http.post<PlatformAdmin>(`${this.base}/${id}/deactivate`, {});
  }

  reactivate(id: number): Observable<PlatformAdmin> {
    return this.http.post<PlatformAdmin>(`${this.base}/${id}/reactivate`, {});
  }

  /** N'aboutit que sur une fiche jamais rattachée ; sinon le serveur renvoie à la désactivation. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
