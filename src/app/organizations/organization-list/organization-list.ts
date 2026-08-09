import { Component, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { OrganizationAdmin } from '../models';
import { OrganizationService } from '../organization.service';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-organization-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './organization-list.html',
  styleUrl: './organization-list.scss',
})
export class OrganizationList {
  private readonly organizationService = inject(OrganizationService);

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly organizations = signal<OrganizationAdmin[]>([]);
  readonly totalItems = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(25);
  readonly searchTerm = signal('');
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly displayedColumns = ['name', 'taxCountry', 'salonCount', 'status'];

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.page.set(0);
        this.searchTerm.set(term.trim());
      });

    effect(() => {
      const search = this.searchTerm();
      const page = this.page();
      const size = this.pageSize();
      untracked(() => this.load(search, page, size));
    });
  }

  changePage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.page.set(event.pageIndex);
  }

  private load(search: string, page: number, size: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.organizationService.list({ search, page, size }).subscribe({
      next: (result) => {
        this.organizations.set(result.items);
        this.totalItems.set(result.totalItems);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les organisations.');
        this.loading.set(false);
      },
    });
  }
}
