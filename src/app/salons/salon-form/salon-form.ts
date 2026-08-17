import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { OrganizationAdmin } from '../../organizations/models';
import { OrganizationService } from '../../organizations/organization.service';
import { MAX_PAGE_SIZE } from '../../core/http/page';
import { TaxRegime, TaxRegimeInfo } from '../../tax/models';
import { TaxService } from '../../tax/tax.service';
import { SalonAudit } from '../salon-audit/salon-audit';
import { SalonService } from '../salon.service';

@Component({
  selector: 'app-salon-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    SalonAudit,
  ],
  templateUrl: './salon-form.html',
  styleUrl: './salon-form.scss',
})
export class SalonForm {
  private readonly fb = inject(FormBuilder);
  private readonly salonService = inject(SalonService);
  private readonly organizationService = inject(OrganizationService);
  private readonly taxService = inject(TaxService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly idParam = this.route.snapshot.paramMap.get('id');
  readonly salonId = this.idParam ? Number(this.idParam) : null;

  readonly organizations = signal<OrganizationAdmin[]>([]);
  readonly regimes = signal<TaxRegimeInfo[]>([]);
  readonly organizationName = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    organizationId: [null as number | null, Validators.required],
    name: ['', Validators.required],
    address: [''],
    phone: [''],
    email: ['', Validators.email],
    taxRegime: [TaxRegime.TGC, Validators.required],
    active: [true],
  });

  constructor() {
    this.taxService.regimes().subscribe({
      next: (regimes) => this.regimes.set(regimes),
      error: () => undefined,
    });

    if (this.salonId === null) {
      // Creation : l'organisation se choisit dans le formulaire.
      this.organizationService.list({ size: MAX_PAGE_SIZE }).subscribe({
        next: (result) => {
          this.organizations.set(result.items);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Impossible de charger les organisations.');
          this.loading.set(false);
        },
      });
      return;
    }

    // Edition : l'organisation est fixe, affichee en lecture seule (voir SalonAdminUpdateRequest
    // cote backend — un salon ne change pas d'organisation apres sa creation).
    this.salonService.get(this.salonId).subscribe({
      next: (salon) => {
        this.form.patchValue({
          organizationId: salon.organizationId,
          name: salon.name,
          address: salon.address ?? '',
          phone: salon.phone ?? '',
          email: salon.email ?? '',
          taxRegime: salon.taxRegime,
          active: salon.active,
        });
        this.organizationName.set(salon.organizationName);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger ce salon.');
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    const raw = this.form.getRawValue();

    const request$ = this.salonId === null
      ? this.salonService.create({
          organizationId: raw.organizationId!,
          name: raw.name,
          address: raw.address || null,
          phone: raw.phone || null,
          email: raw.email || null,
          taxRegime: raw.taxRegime,
        })
      : this.salonService.update(this.salonId, {
          name: raw.name,
          address: raw.address || null,
          phone: raw.phone || null,
          email: raw.email || null,
          taxRegime: raw.taxRegime,
          active: raw.active,
        });

    request$.subscribe({
      next: () => this.router.navigateByUrl('/salons'),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Une erreur est survenue, réessayez.');
      },
    });
  }
}
