import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SubscriptionStatus } from '../../subscriptions/models';
import { Evolution, PlatformOverview, Rapport } from '../models';
import { OverviewService } from '../overview.service';

/** Les statuts dans l'ordre du cycle de vie, pas dans celui de l'énumération. */
const STATUTS: { valeur: SubscriptionStatus; label: string }[] = [
  { valeur: 'TRIAL', label: 'En essai' },
  { valeur: 'ACTIVE', label: 'Actifs' },
  { valeur: 'TRIAL_ENDED', label: 'Essai terminé' },
  { valeur: 'LAPSED', label: 'Échus' },
  { valeur: 'CANCELLED', label: 'Résiliés' },
];

/**
 * L'état de la plateforme, et ce qui demande une action.
 *
 * <p><b>C'est l'écran d'accueil du backoffice</b>, à la place de l'état des lieux des abonnements.
 * Celui-ci l'était « parce que c'est la seule page où l'inaction se paie » — le raisonnement reste
 * juste, mais ce tableau porte désormais ce constat **et** le reste. Il y renvoie plutôt que de le
 * remplacer : les listes complètes vivent sur leurs écrans.
 *
 * <p><b>Trois natures de chiffres, séparées à l'écran.</b> Le stock dit où l'on en est, le mouvement
 * ce qui a bougé, les rapports ce qu'il faut faire. Les mélanger ferait lire un total comme une
 * progression.
 */
@Component({
  selector: 'app-overview-page',
  imports: [DecimalPipe, KeyValuePipe, RouterLink, MatButtonToggleModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.scss',
})
export class OverviewPage {
  private readonly overviewService = inject(OverviewService);

  readonly overview = signal<PlatformOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly jours = signal(30);

  protected readonly statuts = STATUTS;

  constructor() {
    this.load();
  }

  changerPeriode(jours: number): void {
    this.jours.set(jours);
    this.load();
  }

  /**
   * La variation, ou rien.
   *
   * <p><b>Une progression depuis zéro n'est pas « +100 % »</b>, c'est un démarrage — et l'annoncer en
   * pourcentage ferait lire une performance là où il n'y a pas de comparaison possible. Même règle
   * que la vue de groupe côté frontoffice : ce qui ne se calcule pas reste vide, jamais zéro.
   */
  variation(evolution: Evolution): number | null {
    if (evolution.precedente === 0) {
      return null;
    }
    return Math.round(((evolution.periode - evolution.precedente) / evolution.precedente) * 100);
  }

  /** Les rapports qui portent quelqu'un, dans l'ordre de ce que l'inaction coûte. */
  rapportsAVoir(): { titre: string; aide: string; rapport: Rapport; route: string }[] {
    const o = this.overview();
    if (!o) {
      return [];
    }
    const r = o.rapports;
    return [
      { titre: 'Caisse fermée', aide: "L'inaction se paie tout de suite : ces salons ne peuvent plus encaisser.", rapport: r.bloques, route: '/subscriptions' },
      { titre: 'À échéance sous 60 jours', aide: 'Le délai qui laisse le temps de facturer un annuel et d’être payé.', rapport: r.aEcheance, route: '/subscriptions' },
      { titre: 'Essais non convertis', aide: "L'essai est terminé et aucun règlement n'a été enregistré.", rapport: r.essaisNonConvertis, route: '/subscriptions' },
      { titre: 'Personne ne peut plus s’y connecter', aide: 'Aucun propriétaire actif et rattaché : l’entreprise est enfermée dehors.', rapport: r.sansAccesProprietaire, route: '/organizations' },
      { titre: 'Inscrits sans salon', aide: 'Le parcours s’est arrêté avant de commencer.', rapport: r.sansSalon, route: '/organizations' },
      { titre: 'Salons qui n’ont jamais encaissé', aide: 'Un client qu’on perd sans le voir.', rapport: r.sansVente, route: '/salons' },
      { titre: 'Abonnements sans offre', aide: 'Antérieurs à la grille tarifaire : ils ne comptent dans aucun revenu.', rapport: r.sansOffre, route: '/subscriptions' },
    ].filter((ligne) => ligne.rapport.total > 0);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.overviewService.describe(this.jours()).subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => {
        // Un échec efface le résultat précédent : le garder affiché le ferait passer pour celui de
        // la période qu'on vient de demander.
        this.overview.set(null);
        this.error.set("L'état de la plateforme n'a pas pu être chargé.");
        this.loading.set(false);
      },
    });
  }
}
