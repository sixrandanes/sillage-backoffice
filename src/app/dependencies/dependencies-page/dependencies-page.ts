import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { DependenciesService } from '../dependencies.service';
import { DependencyHealth, DependencyState, DependencyStatus } from '../models';

/**
 * La santé des services extérieurs.
 *
 * **Un email refusé et une API en panne sont le même fait** : un appel sortant qui a échoué. C'est
 * ce qui permet à un seul écran de répondre aux deux questions — « pourquoi la cliente n'a-t-elle
 * pas reçu son bon ? » et « EPayNC répond-il ? ».
 *
 * **Rien ici n'est sondé.** Le serveur lit le trafic réel, donc ce que les salons vivent. La
 * contrepartie est qu'il ne peut rien dire quand personne n'appelle — et ce silence est **annoncé**
 * plutôt que peint en vert.
 */
@Component({
  selector: 'app-dependencies-page',
  imports: [MatButtonToggleModule, MatCardModule, MatProgressSpinnerModule, MatTableModule],
  templateUrl: './dependencies-page.html',
  styleUrl: './dependencies-page.scss',
})
export class DependenciesPage {
  private readonly service = inject(DependenciesService);

  readonly health = signal<DependencyHealth | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly days = signal(7);

  readonly columns = ['service', 'statut', 'appels', 'echecs', 'duree', 'dernier'];
  readonly failureColumns = ['quand', 'service', 'operation', 'cause'];

  /**
   * Ce qui demande une action, en premier.
   *
   * Une dépendance jamais appelée n'en fait **pas** partie : elle appelle une vérification, pas une
   * réparation, et la mêler aux pannes ferait crier au loup sur toutes les intégrations pas encore
   * câblées.
   */
  readonly enSouffrance = computed(() =>
    (this.health()?.dependances ?? []).filter(
      (etat) => etat.statut === 'EN_PANNE' || etat.statut === 'DEGRADEE',
    ),
  );

  readonly jamaisAppelees = computed(() =>
    (this.health()?.dependances ?? []).filter((etat) => etat.statut === 'JAMAIS_APPELEE'),
  );

  constructor() {
    this.load(7);
  }

  changeWindow(days: number): void {
    this.days.set(days);
    this.load(days);
  }

  /** Un statut se lit à la couleur avant de se lire au mot. */
  statusClass(statut: DependencyStatus): string {
    switch (statut) {
      case 'OPERATIONNELLE':
        return 'dep-ok';
      case 'DEGRADEE':
        return 'dep-degraded';
      case 'EN_PANNE':
        return 'dep-down';
      default:
        return 'dep-unknown';
    }
  }

  statusLabel(statut: DependencyStatus): string {
    switch (statut) {
      case 'OPERATIONNELLE':
        return 'Opérationnelle';
      case 'DEGRADEE':
        return 'Dégradée';
      case 'EN_PANNE':
        return 'En panne';
      default:
        return 'Jamais appelée';
    }
  }

  /**
   * Le taux d'échec, **jamais un taux de réussite**.
   *
   * On ouvre cet écran pour trouver ce qui ne va pas ; « 99,4 % de réussite » demande une
   * soustraction mentale pour répondre à la question posée.
   */
  failureRate(etat: DependencyState): string {
    if (etat.appels === 0) {
      return '—';
    }
    const taux = (etat.echecs / etat.appels) * 100;
    return `${taux < 1 && taux > 0 ? taux.toFixed(1) : Math.round(taux)} %`;
  }

  /** Une date se lit dans le fuseau du poste : c'est l'exploitation, pas la caisse d'un salon. */
  when(instant: string | null): string {
    if (!instant) {
      return '—';
    }
    return new Date(instant).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  private load(days: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.health(days).subscribe({
      next: (health) => {
        this.health.set(health);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set("Impossible de lire l'état des services extérieurs.");
        this.loading.set(false);
      },
    });
  }
}
