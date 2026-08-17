import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { AuditEntry, AuditFamily, FamilyOption, familySeverity } from '../models';
import { AuditService } from '../audit.service';

@Component({
  selector: 'app-audit-page',
  imports: [
    DatePipe,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './audit-page.html',
  styleUrl: './audit-page.scss',
})
export class AuditPage {
  private readonly auditService = inject(AuditService);

  readonly entries = signal<AuditEntry[]>([]);
  readonly families = signal<FamilyOption[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly family = signal<AuditFamily | null>(null);
  readonly size = signal(100);

  readonly displayedColumns = ['occurredAt', 'action', 'subject', 'details', 'actor'];

  constructor() {
    this.auditService.families().subscribe({
      next: (families) => this.families.set(families),
      // Sans les familles, seul le filtre disparaît : le journal reste lisible.
      error: () => this.families.set([]),
    });
    this.load();
  }

  changeFamily(family: AuditFamily | null): void {
    this.family.set(family);
    this.load();
  }

  changeSize(size: number): void {
    this.size.set(size);
    this.load();
  }

  severity(entry: AuditEntry): string {
    return familySeverity(entry.family);
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.auditService.journal(null, this.family(), this.size()).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger le journal.');
        this.loading.set(false);
      },
    });
  }
}
