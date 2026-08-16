import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';

/**
 * Le retour du fournisseur : on range le jeton, on demande qui l'on est, puis on entre.
 *
 * <p><b>Le jeton arrive dans le fragment</b> (`#access_token=…`), pas en parametre de requete : un
 * fragment n'est pas transmis au serveur, donc absent des journaux d'acces et de l'en-tete
 * `Referer`. Il est retire de la barre d'adresse des qu'il est range — par `replaceState` et non
 * `pushState`, sinon un retour arriere y ramenerait.
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
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = fragment.get('access_token');
    const returnTo = fragment.get('return_to') ?? '/';

    if (!token) {
      this.message.set("La connexion n'a pas abouti.");
      return;
    }

    this.auth.storeToken(token);
    history.replaceState(null, '', '/callback');

    this.auth.restoreSession().subscribe((admin) => {
      if (admin) {
        void this.router.navigateByUrl(returnTo);
        return;
      }
      // Authentifie chez le fournisseur, mais absent de `platform_admins` : le rattachement y est
      // manuel, et le dire vaut mieux que de renvoyer se connecter en boucle.
      this.message.set(
        this.auth.unknownAdmin()
          ? "Votre compte n'est pas encore autorisé sur le backoffice. Demandez son rattachement à l'équipe Sillage."
          : "La session n'a pas pu être établie.",
      );
    });
  }

  protected retry(): void {
    this.auth.login();
  }
}
