import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { OrganizationService } from '../organization.service';
import { OrganizationUsers } from '../organization-users/organization-users';

@Component({
  selector: 'app-organization-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    OrganizationUsers,
  ],
  templateUrl: './organization-form.html',
  styleUrl: './organization-form.scss',
})
export class OrganizationForm {
  private readonly fb = inject(FormBuilder);
  private readonly organizationService = inject(OrganizationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly organizationId = Number(this.route.snapshot.paramMap.get('id'));

  /** Le meme identifiant, expose au panneau des comptes. */
  readonly organizationIdForUsers = this.organizationId;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly salonCount = signal(0);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    taxCountry: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    // **Pas de `required`**, alors que la facturation les exige : les imposer bloquerait le support
    // qui vient juste corriger un nom. C'est l'émission qui refuse, et l'écran qui prévient.
    billingAddress: [''],
    taxId: [''],
    active: [true],
  });

  /**
   * **Ce qui empêchera de facturer ce client**, dit avant qu'on le découvre au moment d'émettre.
   *
   * Le propriétaire peut les renseigner lui-même depuis son espace : le support n'a pas à courir
   * après, mais il doit pouvoir le voir quand un client appelle parce que sa facture n'arrive pas.
   */
  readonly billingIdentityMissing = signal<string[]>([]);

  constructor() {
    this.organizationService.get(this.organizationId).subscribe({
      next: (organization) => {
        this.form.patchValue({
          name: organization.name,
          taxCountry: organization.taxCountry,
          billingAddress: organization.billingAddress ?? '',
          taxId: organization.taxId ?? '',
          active: organization.active,
        });
        this.billingIdentityMissing.set([
          ...(organization.billingAddress ? [] : ['adresse de facturation']),
          ...(organization.taxId ? [] : ['RIDET']),
        ]);
        this.salonCount.set(organization.salonCount);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger cette organisation.');
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
    this.organizationService.update(this.organizationId, {
      name: raw.name,
      taxCountry: raw.taxCountry.toUpperCase(),
      billingAddress: raw.billingAddress,
      taxId: raw.taxId,
      active: raw.active,
    }).subscribe({
      next: () => this.router.navigateByUrl('/organizations'),
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Une erreur est survenue, réessayez.');
      },
    });
  }
}
