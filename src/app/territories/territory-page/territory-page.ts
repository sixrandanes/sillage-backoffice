import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Territory } from '../../tax/models';
import { TerritoryView } from '../models';
import { formatInZone } from '../../core/zone';
import { TerritoryService } from '../territory.service';

/**
 * Ou l'on vend — et ce que chaque territoire determine.
 *
 * <p><b>C'etait un panneau pose en tete de la page des taxes</b>, et le raisonnement se defendait
 * tant que le territoire n'etait qu'un interrupteur : « un ecran separe pour deux interrupteurs
 * serait une entree de menu de plus pour rien ». Ce raisonnement ne tient plus, parce que la
 * premisse etait fausse — un territoire n'est pas une notion fiscale. Il determine le **fuseau
 * horaire** qui decoupe les journees comptables, le bareme applicable, le nom porte sur un ticket,
 * l'indicatif telephonique des messages sortants. La fiscalite est une de ses <b>consequences</b>,
 * pas son cadre.
 *
 * <p>Le ranger sous les taxes avait un cout concret : on ne pouvait pas y arriver directement, rien
 * ne disait qu'un territoire porte un fuseau, et la moindre question territoriale future — une
 * devise, un plan de numerotation — n'aurait eu nulle part ou aller.
 */
@Component({
  selector: 'app-territory-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
  ],
  templateUrl: './territory-page.html',
  styleUrl: './territory-page.scss',
})
export class TerritoryPage {
  private readonly territoryService = inject(TerritoryService);

  readonly territories = signal<TerritoryView[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal<Territory | null>(null);

  constructor() {
    this.load();
  }

  /**
   * La date et l'heure qu'il est **la-bas**, maintenant.
   *
   * <p><b>La date, et pas seulement l'heure</b> — c'est la correction qui compte. Vingt et une
   * heures separent Nouméa de Papeete : ce n'est pas un decalage d'horaire, c'est un decalage de
   * <b>jour</b>. Afficher « 08:15 » sans dire quel jour est plus trompeur que de ne rien afficher,
   * puisque c'est precisement le jour qui fait qu'une journee comptable ne se decoupe pas au meme
   * moment des deux cotes.
   *
   * <p>Le serveur rend l'identifiant IANA, la mise en forme appartient au client — et elle passe par
   * `Intl`, jamais par la `DatePipe`, qui ne comprend pas un nom IANA et retombe <b>en silence</b>
   * sur le fuseau du navigateur.
   */
  localDate(territory: TerritoryView): string {
    return formatInZone(new Date(), territory.zoneId);
  }

  toggle(territory: TerritoryView, open: boolean): void {
    this.busy.set(territory.territory);
    this.error.set(null);
    this.territoryService.setOpen(territory.territory, open).subscribe({
      next: () => {
        this.busy.set(null);
        this.load();
      },
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(null);
        this.error.set(err.error?.message ?? "Ce territoire n'a pas pu être modifié.");
        // Recharger remet l'interrupteur dans l'état réel : le laisser sur la position cliquée
        // ferait croire à un changement qui n'a pas eu lieu. C'est le mode de défaillance propre
        // aux interrupteurs, et il est silencieux.
        this.load();
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.territoryService.list().subscribe({
      next: (territories) => {
        this.territories.set(territories);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les territoires.');
        this.loading.set(false);
      },
    });
  }
}
