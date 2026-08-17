import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { AuditActionOption, SalonAuditEntry } from '../audit.models';
import { formatInZone } from '../../core/zone';
import { SalonAuditService } from '../salon-audit.service';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Le journal de caisse d'un salon, vu depuis le support.
 *
 * Placé sur la fiche du salon : on y arrive avec un litige en tête (« qui a annulé ce bon ? »), et
 * un écran autonome obligerait à retrouver le salon deux fois.
 */
@Component({
  selector: 'app-salon-audit',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './salon-audit.html',
  styleUrl: './salon-audit.scss',
})
export class SalonAudit {
  private readonly salonAuditService = inject(SalonAuditService);

  readonly salonId = input.required<number>();

  /**
   * Le fuseau du salon, pour dater ses écritures **chez lui**.
   *
   * <p>Le journal les rendait dans le fuseau du navigateur : depuis Nouméa, chaque ligne d'un salon
   * polynésien annonçait le mauvais **jour**. C'est le même défaut que celui documenté côté
   * frontoffice, où il avait touché six écrans — et il est plus grave ici, puisque le backoffice
   * regarde par construction des salons d'autres territoires que celui de l'opérateur.
   */
  readonly zoneId = input<string | null>(null);

  /** Une écriture, datée dans le fuseau du salon. */
  protected when(occurredAt: string): string {
    return formatInZone(occurredAt, this.zoneId());
  }

  readonly entries = signal<SalonAuditEntry[]>([]);
  readonly actions = signal<AuditActionOption[]>([]);
  readonly totalItems = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly page = signal(0);
  readonly pageSize = signal(25);
  readonly action = signal<string | null>(null);
  readonly from = signal<Date | null>(null);
  readonly to = signal<Date | null>(null);
  readonly searchTerm = signal('');

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly displayedColumns = ['sequence', 'occurredAt', 'action', 'details', 'actor'];

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.page.set(0);
        this.searchTerm.set(term.trim());
      });

    effect(() => {
      const salonId = this.salonId();
      untracked(() => {
        this.salonAuditService.actions(salonId).subscribe({
          next: (actions) => this.actions.set(actions),
          // Sans les libellés, seul le filtre par nature disparaît : le journal reste lisible.
          error: () => this.actions.set([]),
        });
      });
    });

    effect(() => {
      const salonId = this.salonId();
      const criteres = {
        action: this.action(),
        from: this.from(),
        to: this.to(),
        search: this.searchTerm(),
        page: this.page(),
        size: this.pageSize(),
      };
      untracked(() => this.load(salonId, criteres));
    });
  }

  changePage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.page.set(event.pageIndex);
  }

  changeAction(action: string | null): void {
    this.page.set(0);
    this.action.set(action);
  }

  changeFrom(from: Date | null): void {
    this.page.set(0);
    this.from.set(from);
  }

  changeTo(to: Date | null): void {
    this.page.set(0);
    this.to.set(to);
  }

  /**
   * L'empreinte, abrégée pour l'écran.
   *
   * Elle en fait 64 caractères : entière, elle chasserait tout le reste de la ligne. Les douze
   * premiers suffisent à comparer deux lignes ou à recopier une référence dans un échange, et
   * l'empreinte complète reste dans la réponse.
   */
  shortHash(hash: string): string {
    return hash.slice(0, 12);
  }

  /**
   * Une date envoyée en `AAAA-MM-JJ`, jamais un instant.
   *
   * `toISOString()` convertit en UTC : sur un poste à Nouméa (UTC+11), une date choisie au
   * calendrier repartirait la veille. Et ici l'erreur ne serait pas cosmétique — le serveur résout
   * ces bornes **dans le fuseau du salon**, donc un jour d'écart change les écritures retournées.
   */
  private asIsoDate(date: Date | null): string | null {
    if (!date) {
      return null;
    }
    const mois = `${date.getMonth() + 1}`.padStart(2, '0');
    const jour = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${mois}-${jour}`;
  }

  private load(
    salonId: number,
    criteres: {
      action: string | null;
      from: Date | null;
      to: Date | null;
      search: string;
      page: number;
      size: number;
    },
  ): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.salonAuditService
      .entries(salonId, {
        action: criteres.action,
        from: this.asIsoDate(criteres.from),
        to: this.asIsoDate(criteres.to),
        search: criteres.search,
        page: criteres.page,
        size: criteres.size,
      })
      .subscribe({
        next: (result) => {
          this.entries.set(result.items);
          this.totalItems.set(result.totalItems);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('Impossible de charger le journal de ce salon.');
          this.loading.set(false);
        },
      });
  }
}
