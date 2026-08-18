import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';

import { SubscriptionOptions } from '../../subscriptions/models';
import { BillingPeriod, Offer, OfferRequest, SubscriptionPlan, offerSeverity } from '../models';
import { OfferService } from '../offer.service';

@Component({
  selector: 'app-offer-page',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './offer-page.html',
  styleUrl: './offer-page.scss',
})
export class OfferPage {
  private readonly offerService = inject(OfferService);

  readonly offers = signal<Offer[]>([]);

  /**
   * La grille se lit **a une date**, passee ou future : ce compte est celui des offres valables
   * ce jour-la, pas de toutes celles qui ont existe. L'ecran dit deja la date en rouge quand ce
   * n'est pas aujourd'hui — le compte suit la meme lecture.
   */
  readonly countLabel = computed(() => {
    const total = this.offers().length;
    return `${total} offre${total > 1 ? 's' : ''}`;
  });
  readonly options = signal<SubscriptionOptions | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly asOf = signal<Date | null>(null);
  readonly editing = signal<Offer | null>(null);
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  readonly done = signal<string | null>(null);

  readonly displayedColumns = ['code', 'plan', 'price', 'trial', 'validity', 'actions'];

  readonly form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    plan: new FormControl<SubscriptionPlan>('SOLO', { nonNullable: true }),
    billingPeriod: new FormControl<BillingPeriod>('MONTHLY', { nonNullable: true }),
    price: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
    setupFee: new FormControl<number | null>(null),
    freeMonths: new FormControl(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(11)] }),
    trialDays: new FormControl(30, { nonNullable: true, validators: [Validators.min(0), Validators.max(365)] }),
    validFrom: new FormControl<Date | null>(null, { validators: [Validators.required] }),
    validTo: new FormControl<Date | null>(null),
  });

  /**
   * La grille est-elle lue à une autre date qu'aujourd'hui ?
   *
   * L'écran doit le dire : sans ce rappel, on lirait une grille passée en croyant voir celle du
   * jour, et on modifierait un tarif à partir d'une lecture fausse. Même leçon que la grille
   * fiscale.
   */
  readonly isHistorical = computed(() => this.asOf() !== null);

  /**
   * Les mois offerts n'ont de sens que sur une annuelle : le serveur refuse, l'écran n'y mène pas.
   *
   * Passe par `toSignal` et non par la valeur du contrôle : `computed()` ne suit que des signaux,
   * et lire `form.controls.x.value` directement donne un calcul qui **ne se réévalue jamais** — le
   * champ n'apparaîtrait donc jamais en changeant la périodicité. Trouvé par un test, pas à l'œil.
   */
  private readonly billingPeriodValue = toSignal(this.form.controls.billingPeriod.valueChanges, {
    initialValue: this.form.controls.billingPeriod.value,
  });

  readonly freeMonthsApply = computed(() => this.billingPeriodValue() === 'YEARLY');

  constructor() {
    this.offerService.options().subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set(null),
    });
    this.load();
  }

  severity(offer: Offer): string {
    return offerSeverity(offer.status);
  }

  changeAsOf(date: Date | null): void {
    this.asOf.set(date);
    this.load();
  }

  /** Revenir à aujourd'hui n'envoie pas la date du jour, mais aucun paramètre. */
  backToToday(): void {
    this.asOf.set(null);
    this.load();
  }

  edit(offer: Offer): void {
    this.editing.set(offer);
    this.formError.set(null);
    this.done.set(null);
    this.form.setValue({
      code: offer.code,
      label: offer.label,
      plan: offer.plan,
      billingPeriod: offer.billingPeriod,
      price: Number(offer.price),
      setupFee: offer.setupFee === null ? null : Number(offer.setupFee),
      freeMonths: offer.freeMonths,
      trialDays: offer.trialDays,
      validFrom: new Date(offer.validFrom),
      validTo: offer.validTo ? new Date(offer.validTo) : null,
    });
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({
      code: '',
      label: '',
      plan: 'SOLO',
      billingPeriod: 'MONTHLY',
      price: null,
      setupFee: null,
      freeMonths: 0,
      trialDays: 30,
      validFrom: null,
      validTo: null,
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    if (!raw.validFrom || raw.price === null) {
      return;
    }
    const request: OfferRequest = {
      code: raw.code.trim().toUpperCase(),
      label: raw.label.trim(),
      plan: raw.plan,
      billingPeriod: raw.billingPeriod,
      price: raw.price,
      setupFee: raw.setupFee,
      // Sur une mensuelle, les mois offerts sont refusés côté serveur : on n'envoie pas une valeur
      // que le formulaire aurait gardée d'une saisie précédente.
      freeMonths: raw.billingPeriod === 'YEARLY' ? raw.freeMonths : 0,
      trialDays: raw.trialDays,
      validFrom: this.asIsoDate(raw.validFrom)!,
      validTo: this.asIsoDate(raw.validTo),
    };
    const current = this.editing();
    this.run(
      current ? this.offerService.update(current.id, request) : this.offerService.create(request),
      current ? 'Offre modifiée.' : 'Offre créée.',
    );
  }

  delete(offer: Offer): void {
    this.busy.set(true);
    this.formError.set(null);
    this.done.set(null);
    this.offerService.delete(offer.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set('Offre supprimée.');
        if (this.editing()?.id === offer.id) {
          this.cancelEdit();
        }
        this.load();
      },
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.formError.set(err.error?.message ?? "Cette offre n'a pas pu être supprimée.");
      },
    });
  }

  /**
   * Une date envoyée en `AAAA-MM-JJ`, jamais un instant.
   *
   * `toISOString()` convertit en UTC : sur un poste à Nouméa (UTC+11), une offre datée du 1er
   * janvier partirait au 31 décembre — et changerait d'exercice.
   */
  private asIsoDate(date: Date | null): string | null {
    if (!date) {
      return null;
    }
    const mois = `${date.getMonth() + 1}`.padStart(2, '0');
    const jour = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${mois}-${jour}`;
  }

  private run(call: Observable<Offer>, done: string): void {
    this.busy.set(true);
    this.formError.set(null);
    this.done.set(null);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(done);
        this.cancelEdit();
        this.load();
      },
      // Le refus du serveur s'affiche tel quel : lui seul sait quelle offre porte déjà ce code, ou
      // pourquoi des mois offerts n'ont pas de sens ici.
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.formError.set(err.error?.message ?? "Cette offre n'a pas pu être enregistrée.");
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.offerService.list(this.asIsoDate(this.asOf())).subscribe({
      next: (offers) => {
        this.offers.set(offers);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger la grille tarifaire.');
        this.loading.set(false);
      },
    });
  }
}
