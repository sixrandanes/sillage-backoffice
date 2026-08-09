import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CurrentAdmin, LoginRequest, PlatformAuthResponse } from './models';

const TOKEN_STORAGE_KEY = 'kaimana-backoffice.token';
const ADMIN_STORAGE_KEY = 'kaimana-backoffice.admin';

/**
 * Le backoffice n'a pas d'equivalent de GET /api/auth/me (pas encore besoin de rafraichir
 * l'identite depuis le serveur pour un compte plateforme) : la session se restaure depuis ce
 * que /api/platform/auth/login a deja renvoye, mis de cote en localStorage. Si le jeton a
 * expire entre-temps, la premiere requete protegee echoue en 401 et l'application se
 * deconnecte (voir auth.interceptor.ts) — pas besoin d'un aller-retour reseau au demarrage
 * pour verifier ce qu'un 401 verifiera de toute facon a la premiere vraie requete.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentAdminSignal = signal<CurrentAdmin | null>(null);

  readonly currentAdmin = this.currentAdminSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentAdminSignal() !== null);

  get token(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  login(request: LoginRequest): Observable<PlatformAuthResponse> {
    return this.http.post<PlatformAuthResponse>('/api/platform/auth/login', request).pipe(
      tap((response) => this.applySession(response)),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    this.currentAdminSignal.set(null);
  }

  /** Restaure la session depuis ce qui a ete stocke au dernier login. A appeler au demarrage de l'app. */
  restoreSession(): void {
    const token = this.token;
    const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!token || !storedAdmin) {
      return;
    }
    try {
      this.currentAdminSignal.set(JSON.parse(storedAdmin) as CurrentAdmin);
    } catch {
      // Donnee corrompue : repartir d'une session propre plutot que de planter au demarrage.
      this.logout();
    }
  }

  private applySession(response: PlatformAuthResponse): void {
    const { token, ...admin } = response;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
    this.currentAdminSignal.set(admin);
  }
}
