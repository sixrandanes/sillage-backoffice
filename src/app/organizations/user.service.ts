import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { UserAdmin } from './user.models';

/**
 * Le support des comptes d'un client.
 *
 * Les routes sont **nichées sous l'organisation** : on ne cherche jamais « un utilisateur » dans
 * l'absolu, on regarde les comptes de ce client-là. Le chemin porte donc le cloisonnement, et le
 * serveur le revérifie — un identifiant pris chez un autre client rend 404 plutôt que d'agir.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  private base(organizationId: number): string {
    return `${API}/platform/organizations/${organizationId}/users`;
  }

  list(organizationId: number): Observable<UserAdmin[]> {
    return this.http.get<UserAdmin[]>(this.base(organizationId));
  }

  setActive(organizationId: number, userId: number, active: boolean): Observable<UserAdmin> {
    return this.http.post<UserAdmin>(`${this.base(organizationId)}/${userId}/active`, { active });
  }

  setOwner(organizationId: number, userId: number, owner: boolean): Observable<UserAdmin> {
    return this.http.post<UserAdmin>(`${this.base(organizationId)}/${userId}/owner`, { owner });
  }

  /** Retire l'identité attachée : la connexion suivante repasse par le rattachement normal. */
  unlinkIdentity(organizationId: number, userId: number): Observable<UserAdmin> {
    return this.http.post<UserAdmin>(
      `${this.base(organizationId)}/${userId}/unlink-identity`,
      {},
    );
  }

  changeEmail(organizationId: number, userId: number, email: string): Observable<UserAdmin> {
    return this.http.post<UserAdmin>(`${this.base(organizationId)}/${userId}/email`, { email });
  }
}
