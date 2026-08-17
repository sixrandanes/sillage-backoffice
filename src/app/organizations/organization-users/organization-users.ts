import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';

import { ROLE_LABELS, Role, UserAdmin, accessSeverity } from '../user.models';
import { UserService } from '../user.service';

/**
 * Le panneau de support des comptes d'un client.
 *
 * Placé sur la fiche de l'organisation parce que c'est là qu'on arrive quand un client appelle :
 * un écran « comptes » autonome obligerait à retrouver l'entreprise deux fois.
 */
@Component({
  selector: 'app-organization-users',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './organization-users.html',
  styleUrl: './organization-users.scss',
})
export class OrganizationUsers {
  private readonly userService = inject(UserService);

  readonly organizationId = input.required<number>();

  readonly users = signal<UserAdmin[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly busy = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly done = signal<string | null>(null);

  /** Le compte dont on corrige l'adresse, ou aucun. */
  readonly editingEmail = signal<UserAdmin | null>(null);
  readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  readonly displayedColumns = ['name', 'access', 'roles', 'actions'];

  constructor() {
    // Une adresse se **colle** plus souvent qu'elle ne se tape, et `Validators.email` refuse une
    // valeur entouree d'espaces : sans cette normalisation, le bouton restait desactive sans que
    // rien n'explique pourquoi — le pire des refus, celui qui ne se dit pas.
    this.emailControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const trimmed = value.trim();
      if (trimmed !== value) {
        this.emailControl.setValue(trimmed, { emitEvent: false });
      }
    });

    effect(() => {
      const id = this.organizationId();
      untracked(() => this.load(id));
    });
  }

  severity(user: UserAdmin): string {
    return accessSeverity(user.access);
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  reactivate(user: UserAdmin): void {
    this.run(
      this.userService.setActive(this.organizationId(), user.id, true),
      `${user.firstName} ${user.lastName} peut de nouveau se connecter.`,
    );
  }

  deactivate(user: UserAdmin): void {
    this.run(
      this.userService.setActive(this.organizationId(), user.id, false),
      `L'accès de ${user.firstName} ${user.lastName} est coupé dès la prochaine requête.`,
    );
  }

  grantOwner(user: UserAdmin): void {
    this.run(
      this.userService.setOwner(this.organizationId(), user.id, true),
      `${user.firstName} ${user.lastName} peut désormais gérer l'entreprise.`,
    );
  }

  revokeOwner(user: UserAdmin): void {
    this.run(
      this.userService.setOwner(this.organizationId(), user.id, false),
      `${user.firstName} ${user.lastName} n'est plus propriétaire de l'entreprise.`,
    );
  }

  /**
   * Détache l'identité — proposé **uniquement** là où il y en a une.
   *
   * Sur un compte non rattaché, ce bouton ne ferait rien tout en ayant l'air d'agir, ce qui est
   * pire qu'un bouton absent : on croirait avoir réparé.
   */
  unlink(user: UserAdmin): void {
    this.run(
      this.userService.unlinkIdentity(this.organizationId(), user.id),
      `Identité détachée. ${user.firstName} se rattachera à sa prochaine connexion, si son adresse vérifiée correspond.`,
    );
  }

  editEmail(user: UserAdmin): void {
    this.editingEmail.set(user);
    this.emailControl.setValue(user.email);
    this.actionError.set(null);
    this.done.set(null);
  }

  cancelEmail(): void {
    this.editingEmail.set(null);
  }

  saveEmail(): void {
    const user = this.editingEmail();
    if (!user || this.emailControl.invalid) {
      return;
    }
    this.run(
      this.userService.changeEmail(this.organizationId(), user.id, this.emailControl.value),
      'Adresse corrigée.',
      { closeEmail: true },
    );
  }

  private run(
    call: Observable<UserAdmin>,
    done: string,
    options: { closeEmail?: boolean } = {},
  ): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.done.set(null);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(done);
        if (options.closeEmail) {
          this.editingEmail.set(null);
        }
        this.load(this.organizationId());
      },
      // Le refus du serveur s'affiche **tel quel** : lui seul sait dire qu'on s'apprête à retirer
      // le dernier propriétaire actif, ou qu'une adresse est déjà prise.
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.actionError.set(err.error?.message ?? "Ce geste n'a pas pu être effectué.");
      },
    });
  }

  private load(organizationId: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.userService.list(organizationId).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les comptes de ce client.');
        this.loading.set(false);
      },
    });
  }
}
