import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { AuthService } from '../core/auth/auth.service';

/**
 * Il n'y a plus de formulaire ici : ni email, ni mot de passe, ni « mot de passe oublie ». Tout
 * cela appartient au fournisseur d'identite, avec ce que Sillage n'avait jamais su offrir —
 * reinitialisation, verification d'adresse, second facteur.
 *
 * <p><b>L'ecran ne redirige pas tout seul</b>, et c'est un choix pris cote salons puis repris ici.
 * La redirection automatique rend l'arrivee indistinguable d'une panne : le fournisseur reconnait
 * sa session et renvoie aussitot, si bien qu'on traverse deux redirections sans jamais rien voir —
 * impossible de se connecter avec un autre compte, et une page blanche clignotante des que quelque
 * chose accroche en chemin.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  /** Nomme le refus plutot que de le taire : le backend nous renvoie ici avec sa raison. */
  protected readonly reason = this.route.snapshot.queryParamMap.get('erreur');

  /** On arrive d'une deconnexion volontaire, portee par la route `/logout`. */
  protected readonly signedOut = this.route.snapshot.data['signedOut'] === true;

  protected connect(): void {
    this.auth.login(this.route.snapshot.queryParamMap.get('returnTo') ?? '/');
  }
}
