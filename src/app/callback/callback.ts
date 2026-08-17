import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';

/**
 * Le retour du fournisseur : on range le jeton, on demande qui l'on est, puis on entre.
 *
 * <p><b>Plus aucun jeton ne transite ici.</b> Il arrivait dans le fragment (`#access_token=…`) puis
 * vivait dans le `localStorage` ; le backend le garde desormais et n'a pose qu'un cookie
 * `HttpOnly`. Cette page ne recoit qu'une chose : ou l'on retournait.
 *
 * <p><b>Aucune garde sur cette route</b>, deliberement : `guestGuard` renverrait a l'accueil
 * quiconque se reconnecte, et `authGuard` refuserait tout le monde puisqu'on n'a precisement pas
 * encore de session. C'est ce composant qui decide de la suite.
 */
@Component({
  selector: 'app-callback',
  standalone: true,
  template: `
    <div class="callback">
      @if (message()) {
        <p>{{ message() }}</p>
        <button type="button" (click)="retry()">Réessayer</button>
      } @else {
        <p>Connexion en cours…</p>
      }
    </div>
  `,
  styles: `
    .callback {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 80px 24px;
      font: 400 15px/1.5 system-ui, sans-serif;
    }
  `,
})
export class Callback {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly message = signal<string | null>(null);

  constructor() {
    // Le backend a pose le cookie de session ; il ne reste dans l'URL que la destination. Rien de
    // sensible, donc rien a effacer de la barre d'adresse — le `replaceState` d'avant existait
    // uniquement pour faire disparaitre le jeton.
    const returnTo =
      new URLSearchParams(window.location.search).get('return_to') ?? '/';

    // On demande au serveur qui l'on est : c'est cette reponse, et elle seule, qui dit si la
    // session tient. Le navigateur n'a plus rien a verifier lui-meme.
    this.auth.restoreSession().subscribe((admin) => {
      if (admin) {
        void this.router.navigateByUrl(returnTo);
        return;
      }
      // Authentifie chez le fournisseur, mais absent de `platform_admins` : le rattachement y est
      // manuel, et le dire vaut mieux que de renvoyer se connecter en boucle.
      this.message.set(
        this.auth.unknownAdmin()
          ? "Votre compte n'est pas autorisé sur le backoffice. Demandez son rattachement à l'équipe Sillage."
          : "La session n'a pas pu être établie.",
      );
    });
  }

  protected retry(): void {
    this.auth.login();
  }
}
