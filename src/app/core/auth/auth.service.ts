import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';

import { CurrentAdmin } from './models';
import { API } from '../api';
import { clearUserScopedStorage } from '../storage-keys';


/**
 * Le backoffice n'authentifie plus personne.
 *
 * <p>Il se connectait par mot de passe contre `platform_admins.password_hash` — colonne supprimee
 * par la migration V46, quand Sillage a cesse de detenir le moindre mot de passe. L'ecran appelait
 * donc un endpoint qui n'existait plus : le backoffice etait **hors service**, sans qu'aucun
 * message ne le dise.
 *
 * <p>La connexion est une redirection vers le backend, qui echange le code **avec son secret**,
 * garde le jeton **chez lui** et ne pose qu'un cookie `HttpOnly`. Meme montage que l'application
 * des salons, mais par une **seconde application** chez le fournisseur : c'est l'audience qui
 * empeche un jeton de gerante d'ouvrir ce backoffice.
 *
 * <p><b>Le navigateur ne detient plus aucun jeton.</b> Il vivait dans le `localStorage`, lisible
 * par n'importe quelle XSS pendant toute la session ; il ne quitte plus le serveur. Ce fichier n'a
 * donc plus ni `token`, ni `storeToken`, ni verification d'echeance : **c'est le serveur qui sait**,
 * et le seul etat local est « qui suis-je », rendu par `/me`.
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

  /** Depart vers le fournisseur, via le backend qui detient le secret client. */
  login(returnTo: string = '/'): void {
    window.location.href = `${API}/platform/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
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
    const partir = () => {
      this.forgetSession();
      window.location.href = `${API}/platform/auth/logout`;
    };
    // La revocation part toujours : c'est le serveur qui detient le jeton, et c'est lui qui ferme
    // la session. Une revocation refusee ne doit pas retenir quelqu'un qui veut partir.
    this.http.post(`${API}/platform/auth/revoke`, {}).subscribe({
      next: partir,
      error: partir,
    });
  }

  /**
   * Efface ce que l'on sait localement, sans toucher ni a la session serveur ni a celle du
   * fournisseur.
   *
   * <p>`clearUserScopedStorage` reste appele alors que plus rien n'est range : il balaie les cles
   * d'avant le passage au cookie. Un navigateur deja ouvert porte encore son ancien jeton, qui ne
   * sert plus a rien et n'a aucune raison de trainer.
   */
  forgetSession(): void {
    clearUserScopedStorage();
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
    // Plus de court-circuit sur un jeton local : le cookie voyage tout seul, et **c'est le serveur
    // qui repond** si la session vaut encore quelque chose. Demander est aussi rapide que deviner,
    // et ne peut pas se tromper.
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

  /** Repart chercher un jeton sans fermer la session du fournisseur : l'aller-retour est invisible. */
  reauthenticate(returnTo: string): void {
    this.forgetSession();
    this.login(returnTo);
  }
}
