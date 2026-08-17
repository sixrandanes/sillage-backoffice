import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';

import { PlatformAdmin, PlatformAdminRequest, adminState } from '../models';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-admin-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage {
  private readonly adminService = inject(AdminService);

  readonly admins = signal<PlatformAdmin[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  /** La fiche en cours d'édition, ou `null` quand le formulaire sert à en créer une. */
  readonly editing = signal<PlatformAdmin | null>(null);
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  readonly done = signal<string | null>(null);

  readonly displayedColumns = ['name', 'email', 'externalId', 'state', 'actions'];

  readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    externalId: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.load();
  }

  state(admin: PlatformAdmin) {
    return adminState(admin);
  }

  edit(admin: PlatformAdmin): void {
    this.editing.set(admin);
    this.formError.set(null);
    this.done.set(null);
    this.form.setValue({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      externalId: admin.externalId ?? '',
    });
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ firstName: '', lastName: '', email: '', externalId: '' });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const request: PlatformAdminRequest = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: raw.email.trim(),
      // Un champ vide vaut « pas encore rattaché », jamais la chaîne vide : le serveur en fait
      // autant, mais l'envoyer déjà normalisé évite de faire dépendre le sens d'un `trim`
      // distant.
      externalId: raw.externalId.trim() || null,
    };
    const current = this.editing();
    this.run(
      current ? this.adminService.update(current.id, request) : this.adminService.create(request),
      current ? 'Fiche corrigée.' : 'Compte créé.',
      { reset: true },
    );
  }

  deactivate(admin: PlatformAdmin): void {
    this.run(
      this.adminService.deactivate(admin.id),
      admin.self
        ? "Votre propre accès est coupé dès la prochaine requête."
        : `${admin.firstName} ${admin.lastName} n'a plus accès au backoffice.`,
    );
  }

  reactivate(admin: PlatformAdmin): void {
    this.run(this.adminService.reactivate(admin.id), 'Accès rétabli.');
  }

  /**
   * Supprime une fiche jamais rattachée.
   *
   * Proposé **uniquement** sur ces fiches-là : le serveur refuse les autres, et offrir un bouton
   * dont on connaît le refus d'avance est une invitation à se cogner. Même principe que le
   * sélecteur de tranche fiscale.
   */
  canDelete(admin: PlatformAdmin): boolean {
    return admin.externalId === null;
  }

  delete(admin: PlatformAdmin): void {
    this.busy.set(true);
    this.formError.set(null);
    this.done.set(null);
    this.adminService.delete(admin.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set('Fiche supprimée.');
        if (this.editing()?.id === admin.id) {
          this.cancelEdit();
        }
        this.load();
      },
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.formError.set(err.error?.message ?? "Cette fiche n'a pas pu être supprimée.");
      },
    });
  }

  private run(
    call: Observable<PlatformAdmin>,
    done: string,
    options: { reset?: boolean } = {},
  ): void {
    this.busy.set(true);
    this.formError.set(null);
    this.done.set(null);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(done);
        if (options.reset) {
          this.cancelEdit();
        }
        this.load();
      },
      // Le refus du serveur s'affiche **tel quel** : lui seul sait dire quelle adresse est déjà
      // prise, quel compte porte déjà cet identifiant, ou qu'on s'apprête à retirer le dernier
      // accès. Un message générique perdrait exactement ce qui aide à corriger.
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.formError.set(err.error?.message ?? "Ce geste n'a pas pu être effectué.");
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.adminService.list().subscribe({
      next: (admins) => {
        this.admins.set(admins);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les administrateurs.');
        this.loading.set(false);
      },
    });
  }
}
