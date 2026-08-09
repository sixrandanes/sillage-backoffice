import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { TaxCategory, TaxRateInfo, TaxRegime, TaxRegimeInfo } from '../models';
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

  readonly displayedColumns = ['category', 'rate', 'validFrom'];
  readonly historyColumns = ['category', 'rate', 'validFrom', 'validTo'];

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.taxService.regimes().subscribe({
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
      error: () => {
        panel.scheduling = false;
        panel.scheduleError = "Impossible de programmer ce taux — verifiez la date d'effet.";
        this.panels.set([...this.panels()]);
      },
    });
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
