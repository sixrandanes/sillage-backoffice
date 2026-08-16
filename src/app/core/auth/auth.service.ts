import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';

import { CurrentAdmin } from './models';
import { API } from '../api';

/**
 * Cle **distincte** de l'ancienne (`kaimana-backoffice.token`), et ce n'est pas cosmetique : les
 * jetons d'avant etaient signes par Sillage et sont desormais refuses. Changer de cle evite qu'un
 * navigateur deja ouvert reparte avec un jeton perime, rejete a chaque requete sans que rien ne
 * l'explique.
 */
export const TOKEN_KEY = 'sillage-backoffice.token';
const LEGACY_KEYS = ['kaimana-backoffice.token', 'kaimana-backoffice.admin'];

/**
 * Le backoffice n'authentifie plus personne.
 *
 * <p>Il se connectait par mot de passe contre `platform_admins.password_hash` — colonne supprimee
 * par la migration V46, quand Sillage a cesse de detenir le moindre mot de passe. L'ecran appelait
 * donc un endpoint qui n'existait plus : le backoffice etait **hors service**, sans qu'aucun
 * message ne le dise.
 *
 * <p>La connexion est desormais une redirection vers le backend, qui echange le code **avec son
 * secret** et nous renvoie le jeton dans le fragment de l'URL. Meme montage que l'application des
 * salons, mais par une **seconde application** chez le fournisseur : c'est l'audience qui empeche
 * un jeton de gerante d'ouvrir ce backoffice.
 *
 * <p><b>Un `403` sur `/me` n'est pas une panne mais un signal</b> : authentifie chez le
 * fournisseur, inconnu de `platform_admins`. Le rattachement y est manuel — on ne devient pas
 * administrateur plateforme en se connectant — donc l'ecran doit le dire au lieu de boucler sur
 * une reconnexion qui redonnera toujours le meme resultat.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentAdminSignal = signal<CurrentAdmin | null>(null);
  /** Vrai quand le fournisseur nous connait mais que `platform_admins` ne nous connait pas. */
  private readonly unknownAdminSignal = signal(false);

  readonly currentAdmin = this.currentAdminSignal.asReadonly();
  readonly unknownAdmin = this.unknownAdminSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentAdminSignal() !== null);

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** Depart vers le fournisseur, via le backend qui detient le secret client. */
  login(returnTo: string = '/'): void {
    window.location.href = `${API}/platform/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  storeToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Deconnexion complete : on revoque le jeton, on oublie la session locale, puis on ferme la
   * session **chez le fournisseur**.
   *
   * <p>Sans la revocation, le jeton reste valable jusqu'a son expiration et quiconque en aurait
   * pris copie pourrait s'en servir. Sans le passage par le fournisseur, la connexion suivante
   * reconnait sa session et reconnecte sans rien demander — la deconnexion paraitrait sans effet.
   */
  logout(): void {
    const token = this.token;
    const partir = () => {
      this.forgetSession();
      window.location.href = `${API}/platform/auth/logout`;
    };
    if (!token) {
      partir();
      return;
    }
    // Une revocation refusee ne doit pas retenir quelqu'un qui veut partir.
    this.http.post(`${API}/platform/auth/revoke`, null).subscribe({
      next: partir,
      error: partir,
    });
  }

  /** Efface la session locale, sans toucher a celle du fournisseur. */
  forgetSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    LEGACY_KEYS.forEach((cle) => localStorage.removeItem(cle));
    this.currentAdminSignal.set(null);
  }

  /**
   * Qui est connecte, demande au serveur — et non relu d'un `localStorage` qui pourrait mentir.
   *
   * <p>Un `401` efface la session : le jeton ne vaut plus rien. Un `403`, lui, **conserve** le
   * jeton et leve `unknownAdmin` : la personne est bien authentifiee, elle n'est simplement pas
   * administratrice. L'effacer la renverrait se connecter en boucle pour revenir au meme point.
   */
  restoreSession(): Observable<CurrentAdmin | null> {
    if (!this.token) {
      return of(null);
    }
    return this.http.get<CurrentAdmin>(`${API}/platform/auth/me`).pipe(
      tap((admin) => {
        this.currentAdminSignal.set(admin);
        this.unknownAdminSignal.set(false);
      }),
      catchError((err: { status?: number }) => {
        if (err.status === 403) {
          this.unknownAdminSignal.set(true);
        } else {
          this.forgetSession();
        }
        return of(null);
      }),
    );
  }

  /**
   * Le jeton est-il expire, ou sur le point de l'etre ?
   *
   * <p><b>Ce n'est pas une decision de securite</b> — le serveur verifie la signature a chaque
   * requete et reste seul juge. C'est une decision de confort : eviter d'envoyer une requete dont
   * on sait qu'elle echouera. Illisible ou sans `exp`, le jeton est tenu pour expire : mieux vaut
   * une reconnexion inutile qu'une session fantome. Trente secondes de marge couvrent le decalage
   * d'horloge et le temps de vol de la requete.
   */
  isTokenExpired(): boolean {
    const token = this.token;
    if (!token) {
      return true;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      if (!payload.exp) {
        return true;
      }
      return payload.exp * 1000 - 30_000 <= Date.now();
    } catch {
      return true;
    }
  }

  /** Repart chercher un jeton sans fermer la session du fournisseur : l'aller-retour est invisible. */
  reauthenticate(returnTo: string): void {
    this.forgetSession();
    this.login(returnTo);
  }
}
