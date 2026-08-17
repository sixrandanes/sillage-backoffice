import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { TaxRegime } from '../../tax/models';
import { Territory } from '../models';
import { TerritoryService } from '../territory.service';

/**
 * L'ouverture commerciale des territoires.
 *
 * Posé sur la page des taxes : c'est là qu'on parle territoires, et un écran séparé pour deux
 * interrupteurs serait une entrée de menu de plus pour rien.
 */
@Component({
  selector: 'app-territory-panel',
  imports: [MatButtonModule, MatCardModule, MatProgressSpinnerModule, MatSlideToggleModule],
  templateUrl: './territory-panel.html',
  styleUrl: './territory-panel.scss',
})
export class TerritoryPanel {
  private readonly territoryService = inject(TerritoryService);

  readonly territories = signal<Territory[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal<TaxRegime | null>(null);

  constructor() {
    this.load();
  }

  toggle(territory: Territory, open: boolean): void {
    this.busy.set(territory.regime);
    this.error.set(null);
    this.territoryService.setOpen(territory.regime, open).subscribe({
      next: () => {
        this.busy.set(null);
        this.load();
      },
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(null);
        this.error.set(err.error?.message ?? "Ce territoire n'a pas pu être modifié.");
        // Recharger remet l'interrupteur dans l'état réel : le laisser sur la position cliquée
        // ferait croire à un changement qui n'a pas eu lieu.
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
