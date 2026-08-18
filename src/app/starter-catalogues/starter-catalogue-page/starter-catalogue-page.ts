import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { TaxCategoryInfo } from '../../tax/models';
import { TaxService } from '../../tax/tax.service';
import { StarterActivity, StarterService } from '../models';
import { StarterCatalogueService } from '../starter-catalogue.service';

/**
 * Les catalogues de démarrage : ce que coche une gérante qui s'installe.
 *
 * <p><b>Ce que ça remplace</b> : les gammes vivaient dans une classe Java — ajuster un prix ou
 * ajouter une prestation demandait un déploiement. Même trajet que la grille fiscale et les
 * offres : un référentiel est une donnée, il s'édite ici.
 *
 * <p><b>L'édition est libre, et l'écran dit pourquoi</b> : une suggestion n'est référencée nulle
 * part, les prestations créées à partir d'elle sont des copies chez le client. Modifier un prix ne
 * touche jamais un salon existant — à l'inverse des offres et des taux.
 */
@Component({
  selector: 'app-starter-catalogue-page',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './starter-catalogue-page.html',
  styleUrl: './starter-catalogue-page.scss',
})
export class StarterCataloguePage {
  private readonly catalogueService = inject(StarterCatalogueService);
  private readonly taxService = inject(TaxService);
  private readonly formBuilder = inject(FormBuilder);

  readonly activities = signal<StarterActivity[]>([]);
  readonly taxCategories = signal<TaxCategoryInfo[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal<string | null>(null);

  /** Un seul formulaire d'édition ouvert à la fois : l'identifiant de la ligne, ou de l'ajout. */
  readonly editingService = signal<number | null>(null);
  readonly addingTo = signal<number | null>(null);
  readonly renaming = signal<number | null>(null);
  /** Suppression en deux temps sur la ligne, comme les messages : pas de fenêtre modale ici. */
  readonly pendingDeletion = signal<string | null>(null);

  readonly totalServices = computed(() =>
    this.activities().reduce((sum, activity) => sum + activity.services.length, 0),
  );

  readonly activityForm = this.formBuilder.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(80)]],
  });

  readonly serviceForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    durationMinutes: [30, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(1)]],
    taxCategory: ['NORMAL', Validators.required],
  });

  readonly renameForm = this.formBuilder.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(80)]],
  });

  constructor() {
    this.load();
    // Sans les tranches, seul l'ajout de prestation est indisponible : le reste de l'écran
    // continue de fonctionner — même règle que les libellés d'offres sur les abonnements.
    this.taxService.categories().subscribe({
      next: (categories) => this.taxCategories.set(categories),
      error: () => this.taxCategories.set([]),
    });
  }

  createActivity(): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }
    this.run(
      this.catalogueService.createActivity(this.activityForm.getRawValue().label.trim()),
      'Métier ajouté. Il ne propose encore aucune prestation.',
      () => this.activityForm.reset({ label: '' }),
    );
  }

  startRename(activity: StarterActivity): void {
    this.closeForms();
    this.renaming.set(activity.id);
    this.renameForm.reset({ label: activity.label });
  }

  rename(activity: StarterActivity): void {
    if (this.renameForm.invalid) {
      return;
    }
    this.run(
      this.catalogueService.renameActivity(activity.id, this.renameForm.getRawValue().label.trim()),
      'Métier renommé.',
    );
  }

  startAdd(activity: StarterActivity): void {
    this.closeForms();
    this.addingTo.set(activity.id);
    this.serviceForm.reset({ name: '', durationMinutes: 30, price: 0, taxCategory: 'NORMAL' });
  }

  startEdit(activity: StarterActivity, service: StarterService): void {
    this.closeForms();
    this.editingService.set(service.id);
    this.serviceForm.reset({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      taxCategory: service.taxCategory,
    });
  }

  submitService(activity: StarterActivity): void {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }
    const raw = this.serviceForm.getRawValue();
    const request = {
      name: raw.name.trim(),
      durationMinutes: raw.durationMinutes,
      price: raw.price,
      taxCategory: raw.taxCategory,
    };
    const editing = this.editingService();
    this.run(
      editing === null
        ? this.catalogueService.addService(activity.id, request)
        : this.catalogueService.updateService(activity.id, editing, request),
      editing === null ? 'Prestation suggérée.' : 'Suggestion modifiée.',
    );
  }

  askDeletion(key: string): void {
    this.error.set(null);
    this.done.set(null);
    this.pendingDeletion.set(key);
  }

  cancelDeletion(): void {
    this.pendingDeletion.set(null);
  }

  confirmDeleteService(activity: StarterActivity, service: StarterService): void {
    this.run(this.catalogueService.deleteService(activity.id, service.id), 'Suggestion retirée.');
  }

  confirmDeleteActivity(activity: StarterActivity): void {
    this.run(this.catalogueService.deleteActivity(activity.id), 'Métier retiré.');
  }

  cancelForms(): void {
    this.closeForms();
  }

  /** Le plafond du serveur, dit avant le refus : proposer un neuvième ajout serait une invitation à se cogner. */
  isFull(activity: StarterActivity): boolean {
    return activity.services.length >= 8;
  }

  private closeForms(): void {
    this.editingService.set(null);
    this.addingTo.set(null);
    this.renaming.set(null);
    this.pendingDeletion.set(null);
  }

  /**
   * Chaque geste recharge la liste entière plutôt que de recoller la réponse : les positions et
   * l'ordre éditorial viennent du serveur, et un écran qui les recompose finirait par afficher un
   * ordre que personne n'a décidé.
   */
  private run(call: { subscribe: Function }, message: string, after?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.done.set(null);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(message);
        this.closeForms();
        after?.();
        this.load();
      },
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(false);
        // Le refus du serveur s'affiche tel quel : lui seul sait dire qu'un métier est plein,
        // qu'un nom existe déjà, ou quelle tranche est inconnue.
        this.error.set(err.error?.message ?? "Ce geste n'a pas pu aboutir.");
      },
    });
  }

  private load(): void {
    this.catalogueService.list().subscribe({
      next: (activities) => {
        this.activities.set(activities);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les catalogues de démarrage.');
        this.loading.set(false);
      },
    });
  }
}
