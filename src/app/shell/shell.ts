import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../core/auth/auth.service';
import { Version, VersionService } from '../core/version.service';

@Component({
  selector: 'app-shell',
  imports: [DatePipe, RouterLink, RouterLinkActive, RouterOutlet, MatButtonModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly authService = inject(AuthService);
  private readonly versionService = inject(VersionService);

  /**
   * Les deux versions en ligne : celle de cet ecran, et celle du serveur.
   *
   * Les deux conteneurs se deploient separement — l'un peut etre a jour et l'autre non, et c'est
   * precisement le cas ou l'on cherche a comprendre. Lues une fois au demarrage : elles ne changent
   * pas pendant une session, et les resonder ferait deux requetes de plus a chaque navigation.
   */
  readonly backofficeVersion = signal<Version | null>(null);
  readonly backendVersion = signal<Version | null>(null);

  readonly currentAdmin = this.authService.currentAdmin;

  constructor() {
    this.versionService.backoffice().subscribe((v) => this.backofficeVersion.set(v));
    this.versionService.backend().subscribe((v) => this.backendVersion.set(v));
  }

  /**
   * La deconnexion ne navigue pas : elle quitte l'application pour aller fermer la session **chez
   * le fournisseur**, qui nous ramene ensuite sur `/logout`. Naviguer ici en plus ferait partir
   * deux fois, et la seconde annulerait la premiere.
   */
  logout(): void {
    this.authService.logout();
  }
}
