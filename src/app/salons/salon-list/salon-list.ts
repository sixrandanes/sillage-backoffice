import { Component, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { OrganizationAdmin } from '../../organizations/models';
import { OrganizationService } from '../../organizations/organization.service';
import { MAX_PAGE_SIZE } from '../../core/http/page';
import { SalonAdmin } from '../models';
import { SalonService } from '../salon.service';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-salon-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './salon-list.html',
  styleUrl: './salon-list.scss',
})
export class SalonList {
  private readonly salonService = inject(SalonService);
  private readonly organizationService = inject(OrganizationService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly organizationControl = new FormControl<number | null>(null);

  readonly organizations = signal<OrganizationAdmin[]>([]);
  readonly salons = signal<SalonAdmin[]>([]);
  readonly totalItems = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(25);
  readonly searchTerm = signal('');
  readonly organizationId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly displayedColumns = ['name', 'organization', 'contact', 'territory', 'status'];

  constructor() {
    // Peuple le filtre par organisation : le volume reste modeste pour un outil interne, un
    // simple select suffit (a transformer en autocomplete si le nombre de clients grossit).
    this.organizationService.list({ size: MAX_PAGE_SIZE }).subscribe({
      next: (result) => this.organizations.set(result.items),
      error: () => undefined,
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.page.set(0);
        this.searchTerm.set(term.trim());
      });

    this.organizationControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      this.page.set(0);
      this.organizationId.set(id);
    });

    effect(() => {
      const search = this.searchTerm();
      const organizationId = this.organizationId();
      const page = this.page();
      const size = this.pageSize();
      untracked(() => this.load(search, organizationId, page, size));
    });
  }

  changePage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.page.set(event.pageIndex);
  }

  private load(search: string, organizationId: number | null, page: number, size: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.salonService.list({ search, organizationId: organizationId ?? undefined, page, size }).subscribe({
      next: (result) => {
        this.salons.set(result.items);
        this.totalItems.set(result.totalItems);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les salons.');
        this.loading.set(false);
      },
    });
  }
}
