import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { TaxCategory, TaxCategoryInfo, TaxRateInfo, TaxRegime, TaxRegimeInfo } from '../models';
import { TaxService } from '../tax.service';

interface ScheduleForm {
  category: TaxCategory | null;
  ratePercent: number;
  label: string;
  validFrom: Date | null;
}

/** Panneau d'un seul regime : sa grille en vigueur, son formulaire de programmation, son historique. */
interface RegimePanel {
  info: TaxRegimeInfo;
  form: FormGroup<{
    category: FormControl<TaxCategory | null>;
    ratePercent: FormControl<number>;
    label: FormControl<string>;
    validFrom: FormControl<Date | null>;
  }>;
  history: TaxRateInfo[] | null;
  historyLoading: boolean;
  scheduling: boolean;
  scheduleError: string | null;
  scheduleSuccess: boolean;
}

@Component({
  selector: 'app-tax-page',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './tax-page.html',
  styleUrl: './tax-page.scss',
})
export class TaxPage {
  private readonly fb = inject(FormBuilder);
  private readonly taxService = inject(TaxService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly panels = signal<RegimePanel[]>([]);

  /**
   * Le vocabulaire des tranches, **commun aux deux regimes**. Un produit appartient a
   * l'organisation et se vend dans les deux territoires : des tranches propres a chaque regime
   * rendraient la moitie du catalogue intaxable dans l'autre.
   */
  /**
   * La date a laquelle on lit la grille.
   *
   * <p>Le besoin est reel : verifier ce qui s'appliquait l'an dernier avant de repondre a un
   * controle, ou ce qui s'appliquera au 1er janvier apres avoir programme trois changements.
   * L'historique repond a la premiere question ligne par ligne, mais pas a la seconde — il ne
   * montre jamais **la grille entiere** telle qu'elle se presentera.
   *
   * <p>Aucun bloc n'est stocke pour autant : ce sont les memes intervalles, interroges a une autre
   * date (voir `../backend/CLAUDE.md`, fiscalite).
   */
  readonly asOf = signal<Date | null>(null);

  readonly categories = signal<TaxCategoryInfo[]>([]);

  /** Creation d'une tranche : elle ne s'applique nulle part tant qu'aucun taux ne lui est ouvert. */
  readonly categoryForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    label: ['', Validators.required],
    position: [50, [Validators.required, Validators.min(1)]],
  });
  readonly categoryError = signal<string | null>(null);

  readonly displayedColumns = ['category', 'rate', 'validFrom', 'actions'];
  readonly historyColumns = ['category', 'rate', 'validFrom', 'validTo'];

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.taxService.categories().subscribe({
      next: (categories) => this.categories.set(categories),
      // Le referentiel des taux reste lisible sans elles : on ne bloque pas l'ecran entier.
      error: () => this.categories.set([]),
    });
    const on = this.asOf();
    this.taxService.regimes(on ? toIsoDate(on) : undefined).subscribe({
      next: (regimes) => {
        this.panels.set(regimes.map((info) => this.newPanel(info)));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Relit la grille a une autre date. Les gestes d'ecriture, eux, restent dates par leur propre
      champ : consulter le passe ne doit pas laisser croire qu'on peut y ecrire. */
  readAsOf(date: Date | null): void {
    this.asOf.set(date);
    this.reload();
  }

  /** Vrai des qu'on ne regarde plus aujourd'hui : l'ecran doit le dire, sans quoi on lirait une
      grille passee en croyant voir celle du jour. */
  readonly isHistorical = computed(() => this.asOf() !== null);

  toggleHistory(panel: RegimePanel): void {
    if (panel.history !== null) {
      panel.history = null;
      this.panels.set([...this.panels()]);
      return;
    }
    panel.historyLoading = true;
    this.panels.set([...this.panels()]);
    this.taxService.history(panel.info.regime).subscribe({
      next: (history) => {
        panel.history = history;
        panel.historyLoading = false;
        this.panels.set([...this.panels()]);
      },
      error: () => {
        panel.historyLoading = false;
        this.panels.set([...this.panels()]);
      },
    });
  }

  scheduleFor(panel: RegimePanel): void {
    if (panel.form.invalid) {
      panel.form.markAllAsTouched();
      return;
    }

    const raw = panel.form.getRawValue();
    panel.scheduling = true;
    panel.scheduleError = null;
    panel.scheduleSuccess = false;
    this.panels.set([...this.panels()]);

    this.taxService.scheduleRate(panel.info.regime, {
      category: raw.category!,
      rate: raw.ratePercent / 100,
      label: raw.label,
      validFrom: toIsoDate(raw.validFrom!),
    }).subscribe({
      next: () => {
        panel.scheduleSuccess = true;
        this.reload();
      },
      // Le serveur nomme ce qui bloque — date anterieure au taux en vigueur, tranche inconnue,
      // produits encore rattaches. Le remplacer par un libelle generique ferait perdre exactement
      // ce qui aide a corriger.
      error: (err) => this.failed(panel, err, "Impossible de programmer ce taux."),
    });
  }

  // ── Les cinq gestes ─────────────────────────────────────────────────────────────────────

  /** Les tranches auxquelles ce regime applique deja un taux : celles qu'on peut faire evoluer. */
  openCategories(panel: RegimePanel): TaxCategoryInfo[] {
    const ouvertes = new Set(panel.info.rates.map((rate) => rate.category));
    return this.categories().filter((category) => ouvertes.has(category.code));
  }

  /** Celles que ce regime n'applique pas encore : « ajouter une tranche » vu du territoire. */
  closedCategories(panel: RegimePanel): TaxCategoryInfo[] {
    const ouvertes = new Set(panel.info.rates.map((rate) => rate.category));
    return this.categories().filter((category) => !ouvertes.has(category.code));
  }

  /**
   * Un taux programme mais **pas encore en vigueur** — le seul qui se corrige encore.
   *
   * <p>La comparaison se fait sur la date du poste, tandis que le serveur tranche a son heure.
   * L'ecart possible est d'un jour : ce n'est pas grave, c'est le serveur qui refuse au besoin,
   * et l'ecran ne fait qu'eviter de proposer un geste voue au refus.
   */
  isScheduled(rate: TaxRateInfo): boolean {
    return rate.validFrom > toIsoDate(new Date());
  }

  createCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    this.categoryError.set(null);
    this.taxService.createCategory(this.categoryForm.getRawValue()).subscribe({
      next: () => {
        this.categoryForm.reset({ code: '', label: '', position: 50 });
        this.reload();
      },
      error: (err: { error?: { message?: string } }) =>
        this.categoryError.set(err.error?.message ?? 'Impossible de créer cette tranche.'),
    });
  }

  deleteCategory(code: string): void {
    this.categoryError.set(null);
    this.taxService.deleteCategory(code).subscribe({
      next: () => this.reload(),
      // Le serveur dit ce qui bloque : un taux dont l'historique fiscal a besoin, ou des produits
      // qui deviendraient invendables — et combien.
      error: (err: { error?: { message?: string } }) =>
        this.categoryError.set(err.error?.message ?? 'Impossible de supprimer cette tranche.'),
    });
  }

  /** Ouvre une tranche que ce regime n'appliquait pas. */
  openFor(panel: RegimePanel): void {
    if (panel.form.invalid) {
      panel.form.markAllAsTouched();
      return;
    }
    const raw = panel.form.getRawValue();
    this.begin(panel);
    this.taxService.openRate(panel.info.regime, {
      category: raw.category!,
      rate: raw.ratePercent / 100,
      label: raw.label,
      validFrom: toIsoDate(raw.validFrom!),
    }).subscribe({
      next: () => this.reload(),
      error: (err) => this.failed(panel, err, "Impossible d'ouvrir cette tranche."),
    });
  }

  /**
   * Fait cesser une tranche de s'appliquer.
   *
   * <p>Le serveur refuse tant que des produits la portent — ils deviendraient invendables, le taux
   * ne se resolvant plus a l'encaissement. Son refus dit combien sont concernes.
   */
  closeFor(panel: RegimePanel, rate: TaxRateInfo, closesOn: Date | null): void {
    if (!closesOn) {
      panel.scheduleError = 'Choisissez la date a laquelle cette tranche cesse de s\'appliquer.';
      this.panels.set([...this.panels()]);
      return;
    }
    this.begin(panel);
    this.taxService.closeRate(panel.info.regime, rate.category, { closesOn: toIsoDate(closesOn) })
      .subscribe({
        next: () => this.reload(),
        error: (err) => this.failed(panel, err, 'Impossible de fermer cette tranche.'),
      });
  }

  /** Annule un taux programme ; le serveur rouvre celui qu'il devait remplacer. */
  cancelScheduled(panel: RegimePanel, rate: TaxRateInfo): void {
    this.begin(panel);
    this.taxService.cancelRate(rate.id).subscribe({
      next: () => this.reload(),
      error: (err) => this.failed(panel, err, "Impossible d'annuler ce taux."),
    });
  }

  private begin(panel: RegimePanel): void {
    panel.scheduling = true;
    panel.scheduleError = null;
    panel.scheduleSuccess = false;
    this.panels.set([...this.panels()]);
  }

  private failed(panel: RegimePanel, err: { error?: { message?: string } }, repli: string): void {
    panel.scheduling = false;
    panel.scheduleError = err.error?.message ?? repli;
    this.panels.set([...this.panels()]);
  }

  private newPanel(info: TaxRegimeInfo): RegimePanel {
    return {
      info,
      form: this.fb.group({
        category: this.fb.control<TaxCategory | null>(null, Validators.required),
        ratePercent: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(100)] }),
        label: this.fb.control('', { nonNullable: true, validators: Validators.required }),
        validFrom: this.fb.control<Date | null>(null, Validators.required),
      }),
      history: null,
      historyLoading: false,
      scheduling: false,
      scheduleError: null,
      scheduleSuccess: false,
    };
  }
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
