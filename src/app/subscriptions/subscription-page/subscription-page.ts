import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';

import {
  BillingPeriod,
  SubscriptionAdminView,
  SubscriptionOptions,
  SubscriptionPlan,
  statusSeverity,
} from '../models';
import { Offer } from '../../offers/models';
import { OfferService } from '../../offers/offer.service';
import { SubscriptionService } from '../subscription.service';

/** Deux mois : le délai qui laisse le temps de facturer un annuel **et** d'être payé. */
const DEFAULT_HORIZON_DAYS = 60;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Scope = 'expiring' | 'all';

@Component({
  selector: 'app-subscription-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './subscription-page.html',
  styleUrl: './subscription-page.scss',
})
export class SubscriptionPage {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly offerService = inject(OfferService);

  readonly rows = signal<SubscriptionAdminView[]>([]);
  readonly options = signal<SubscriptionOptions | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly scope = signal<Scope>('expiring');
  readonly horizonDays = signal(DEFAULT_HORIZON_DAYS);

  /** L'organisation dont on est en train de traiter l'abonnement, ou aucune. */
  readonly selected = signal<SubscriptionAdminView | null>(null);
  readonly busy = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly actionDone = signal<string | null>(null);

  readonly displayedColumns = ['client', 'plan', 'status', 'accessUntil', 'salons', 'actions'];

  readonly trialForm = new FormGroup({
    days: new FormControl(14, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(365)],
    }),
  });

  readonly coverForm = new FormGroup({
    through: new FormControl<Date | null>(null, { validators: [Validators.required] }),
    billingPeriod: new FormControl<BillingPeriod | null>('MONTHLY'),
  });

  /**
   * La grille, pour rattacher une offre à un abonnement.
   *
   * Chargée telle qu'elle est **aujourd'hui**. Une offre terminée n'y figure donc pas, alors que le
   * serveur l'accepterait : c'est assumé — l'écran sert à rattacher le tarif courant, et constater
   * qu'un client est resté sur un ancien passe par l'API. Le jour où le cas devient courant, il
   * faudra une case « voir les offres terminées ».
   */
  readonly offers = signal<Offer[]>([]);

  readonly offerForm = new FormGroup({
    offerCode: new FormControl<string | null>(null, { validators: [Validators.required] }),
  });

  readonly scheduledOfferForm = new FormGroup({
    offerCode: new FormControl<string | null>(null, { validators: [Validators.required] }),
  });

  readonly planForm = new FormGroup({
    plan: new FormControl<SubscriptionPlan | null>(null, { validators: [Validators.required] }),
  });

  /**
   * Ce qui bloque **aujourd'hui**, compté à part.
   *
   * Un client dont la caisse est fermée ne se distingue pas d'un client qui expire dans six
   * semaines quand les deux sont dans la même liste — or l'un attend un geste et l'autre un
   * rappel.
   */
  readonly blockedCount = computed(
    () => this.rows().filter((row) => statusSeverity(row.status) === 'blocked').length,
  );

  constructor() {
    this.offerService.list(null).subscribe({
      next: (offers) => this.offers.set(offers),
      // Sans la grille, seul le rattachement d'offre est indisponible.
      error: () => this.offers.set([]),
    });
    this.subscriptionService.options().subscribe({
      next: (options) => this.options.set(options),
      // Sans les offres, seuls les gestes de changement d'offre sont indisponibles : le reste de
      // l'écran doit continuer de fonctionner.
      error: () => this.options.set(null),
    });
    this.load();
  }

  changeScope(scope: Scope): void {
    this.scope.set(scope);
    this.load();
  }

  changeHorizon(days: number): void {
    this.horizonDays.set(days);
    if (this.scope() === 'expiring') {
      this.load();
    }
  }

  select(row: SubscriptionAdminView): void {
    this.selected.set(row);
    this.actionError.set(null);
    this.actionDone.set(null);
    this.planForm.reset({ plan: row.plan });
    this.offerForm.reset({ offerCode: row.offerCode });
    this.scheduledOfferForm.reset({ offerCode: row.pendingOfferCode });
    this.coverForm.reset({
      through: row.paidThrough ? new Date(row.paidThrough) : null,
      billingPeriod: row.billingPeriod ?? 'MONTHLY',
    });
    this.trialForm.reset({ days: 14 });
  }

  close(): void {
    this.selected.set(null);
  }

  severity(row: SubscriptionAdminView): string {
    return statusSeverity(row.status);
  }

  /**
   * Le nombre de jours restants, arrondi vers le bas, négatif une fois l'échéance passée.
   *
   * Calculé sur le poste alors que le serveur tranche à la sienne : l'écart possible est de
   * quelques heures, et il est sans conséquence — c'est une aide à la lecture, pas une règle. Ce
   * qui fait foi reste `accessUntil`, affiché à côté.
   */
  daysLeft(row: SubscriptionAdminView): number {
    return Math.floor((new Date(row.accessUntil).getTime() - Date.now()) / MS_PER_DAY);
  }

  /** Un essai déjà payant ne se prolonge pas : c'est sa couverture qu'on repousse. */
  canExtendTrial(row: SubscriptionAdminView): boolean {
    return row.paidThrough === null;
  }

  /** Reconduire suppose de savoir de combien : sans périodicité enregistrée, le serveur refuse. */
  canRenew(row: SubscriptionAdminView): boolean {
    return row.billingPeriod !== null;
  }

  extendTrial(): void {
    const row = this.selected();
    if (!row || this.trialForm.invalid) {
      return;
    }
    const days = this.trialForm.getRawValue().days;
    this.run(
      this.subscriptionService.extendTrial(row.organizationId, days),
      `Essai prolongé de ${days} jours.`,
    );
  }

  cover(): void {
    const row = this.selected();
    const { through, billingPeriod } = this.coverForm.getRawValue();
    if (!row || !through) {
      return;
    }
    this.run(
      this.subscriptionService.cover(row.organizationId, this.asIsoDate(through), billingPeriod),
      'Couverture enregistrée.',
    );
  }

  renew(): void {
    const row = this.selected();
    if (!row) {
      return;
    }
    this.run(this.subscriptionService.renew(row.organizationId), "Abonnement reconduit d'une période.");
  }

  changeOffer(): void {
    const row = this.selected();
    const offerCode = this.offerForm.getRawValue().offerCode;
    if (!row || !offerCode) {
      return;
    }
    this.run(
      this.subscriptionService.changeOffer(row.organizationId, offerCode),
      'Offre rattachée.',
    );
  }

  scheduleOffer(): void {
    const row = this.selected();
    const offerCode = this.scheduledOfferForm.getRawValue().offerCode;
    if (!row || !offerCode) {
      return;
    }
    this.run(
      this.subscriptionService.scheduleOffer(row.organizationId, offerCode),
      'Bascule programmée : elle prendra effet au terme en cours.',
    );
  }

  cancelScheduledOffer(): void {
    const row = this.selected();
    if (!row) {
      return;
    }
    this.run(
      this.subscriptionService.cancelScheduledOffer(row.organizationId),
      "Bascule annulée. L'offre actuelle sera reconduite.",
    );
  }

  changePlan(): void {
    const row = this.selected();
    const plan = this.planForm.getRawValue().plan;
    if (!row || !plan) {
      return;
    }
    this.run(this.subscriptionService.changePlan(row.organizationId, plan), 'Offre modifiée.');
  }

  cancel(): void {
    const row = this.selected();
    if (!row) {
      return;
    }
    this.run(
      this.subscriptionService.cancel(row.organizationId),
      "Reconduction arrêtée. L'accès court jusqu'au terme déjà payé, les salons ne sont pas touchés.",
    );
  }

  resume(): void {
    const row = this.selected();
    if (!row) {
      return;
    }
    this.run(this.subscriptionService.resume(row.organizationId), 'Abonnement repris.');
  }

  /**
   * Une date envoyée en `AAAA-MM-JJ`, jamais un instant.
   *
   * `toISOString()` convertit en UTC : sur un poste à Nouméa (UTC+11), une date choisie au
   * calendrier repartirait **la veille**. C'est la même erreur d'un jour que celle documentée
   * côté serveur entre Nouméa et Papeete, et elle ne se voit qu'aux dates limites.
   */
  private asIsoDate(date: Date): string {
    const mois = `${date.getMonth() + 1}`.padStart(2, '0');
    const jour = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${mois}-${jour}`;
  }

  /**
   * Exécute un geste, puis **recharge la liste**.
   *
   * Remplacer seulement la ligne concernée serait plus économique, mais la liste des échéances est
   * filtrée : un abonnement qu'on vient de couvrir n'en fait plus partie, et le laisser affiché
   * ferait croire que le geste n'a rien changé.
   */
  private run(call: Observable<SubscriptionAdminView>, done: string): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.actionDone.set(null);
    call.subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.actionDone.set(done);
        this.selected.set(updated);
        this.load();
      },
      // Le refus du serveur s'affiche **tel quel** : c'est lui qui sait dire combien de salons
      // sont actifs, ou pourquoi une date est refusée. Un message générique perdrait exactement
      // ce qui aide à corriger.
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.actionError.set(err.error?.message ?? "Ce geste n'a pas pu être effectué.");
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const request =
      this.scope() === 'all'
        ? this.subscriptionService.overview()
        : this.subscriptionService.expiring(this.horizonDays());
    request.subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les abonnements.');
        this.loading.set(false);
      },
    });
  }
}
