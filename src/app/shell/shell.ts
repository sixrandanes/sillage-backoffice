import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatButtonModule, MatToolbarModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly authService = inject(AuthService);

  readonly currentAdmin = this.authService.currentAdmin;

  /**
   * La deconnexion ne navigue pas : elle quitte l'application pour aller fermer la session **chez
   * le fournisseur**, qui nous ramene ensuite sur `/logout`. Naviguer ici en plus ferait partir
   * deux fois, et la seconde annulerait la premiere.
   */
  logout(): void {
    this.authService.logout();
  }
}
