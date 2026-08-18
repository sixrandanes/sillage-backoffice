import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { INVOICE_PAYMENT_METHODS, Invoice, InvoicePaymentMethod } from '../models';
import { InvoiceService } from '../invoice.service';

/**
 * Les factures d'un client, sur sa fiche d'abonnement.
 *
 * Là où l'on gère déjà son offre et sa remise : c'est la même conversation. Un écran « factures »
 * autonome obligerait à retrouver le client deux fois.
 *
 * **Aucun geste de modification ni de suppression n'est proposé, et ce n'est pas un oubli** : une
 * facture erronée se corrige par un avoir. Un bouton « modifier » sur une pièce numérotée suffirait
 * à ôter à la série toute valeur probante — un test le verrouille.
 */
@Component({
  selector: 'app-invoices-panel',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './invoices-panel.html',
  styleUrl: './invoices-panel.scss',
})
export class InvoicesPanel {
  private readonly invoiceService = inject(InvoiceService);

  readonly organizationId = input.required<number>();

  /** Le parent recharge sa liste : une facture émise change ce qu'on lit ailleurs. */
  readonly changed = output<void>();

  readonly invoices = signal<Invoice[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  readonly methods = INVOICE_PAYMENT_METHODS;
  readonly displayedColumns = ['number', 'period', 'amounts', 'status', 'actions'];

  /** Émission : la période couverte se saisit, elle ne se devine pas. */
  readonly issueForm = new FormGroup({
    periodStart: new FormControl<Date | null>(null, Validators.required),
    periodEnd: new FormControl<Date | null>(null, Validators.required),
  });

  /** Règlement : sur une facture choisie, jamais « la dernière ». */
  readonly paymentFor = signal<Invoice | null>(null);
  readonly paymentForm = new FormGroup({
    amount: new FormControl<string>('', Validators.required),
    method: new FormControl<InvoicePaymentMethod>('TRANSFER', Validators.required),
    paidAt: new FormControl<Date | null>(null),
    reference: new FormControl<string>(''),
  });

  constructor() {
    effect(() => {
      const organizationId = this.organizationId();
      untracked(() => this.load(organizationId));
    });
  }

  /**
   * Ce qui reste dû, tel que le serveur l'a calculé.
   *
   * **Jamais recalculé ici** : le reste dû se dérive des règlements, et le refaire côté client
   * ferait diverger les deux au premier règlement partiel.
   */
  statusLabel(invoice: Invoice): string {
    switch (invoice.status) {
      case 'PAID':
        return 'Réglée';
      case 'PARTIALLY_PAID':
        return 'Partiellement réglée';
      case 'CREDIT_NOTE':
        return 'Avoir';
      default:
        return 'Due';
    }
  }

  statusClass(invoice: Invoice): string {
    switch (invoice.status) {
      case 'PAID':
        return 'inv-paid';
      case 'PARTIALLY_PAID':
        return 'inv-partial';
      case 'CREDIT_NOTE':
        return 'inv-credit';
      default:
        return 'inv-due';
    }
  }

  /** Un avoir ne se règle pas, et une facture déjà réglée non plus : le serveur refuserait. */
  canBePaid(invoice: Invoice): boolean {
    return invoice.type === 'INVOICE' && invoice.status !== 'PAID';
  }

  /** Un avoir ne se corrige pas par un autre avoir. */
  canBeCredited(invoice: Invoice): boolean {
    return invoice.type === 'INVOICE';
  }

  issue(): void {
    const { periodStart, periodEnd } = this.issueForm.getRawValue();
    if (!periodStart || !periodEnd) {
      return;
    }
    this.run(
      this.invoiceService.issue(
        this.organizationId(),
        this.asInstant(periodStart),
        this.asInstant(periodEnd),
      ),
      'Facture émise.',
      () => this.issueForm.reset(),
    );
  }

  openPayment(invoice: Invoice): void {
    this.paymentFor.set(invoice);
    this.actionError.set(null);
    // Pré-rempli avec ce qui reste dû : c'est le cas courant, et le montant reste modifiable pour
    // un règlement partiel.
    this.paymentForm.reset({
      amount: invoice.remainingAmount,
      method: 'TRANSFER',
      paidAt: null,
      reference: '',
    });
  }

  closePayment(): void {
    this.paymentFor.set(null);
  }

  recordPayment(): void {
    const invoice = this.paymentFor();
    const { amount, method, paidAt, reference } = this.paymentForm.getRawValue();
    if (!invoice || !amount || !method) {
      return;
    }
    this.run(
      this.invoiceService.recordPayment(
        invoice.id,
        amount,
        method,
        paidAt ? this.asInstant(paidAt) : null,
        reference || null,
      ),
      'Règlement enregistré.',
      () => this.paymentFor.set(null),
    );
  }

  creditNote(invoice: Invoice, reason: string): void {
    this.run(
      this.invoiceService.creditNote(invoice.id, reason || null),
      'Avoir émis.',
    );
  }

  /**
   * Une date envoyée en instant ISO.
   *
   * Le serveur fige la période sur la pièce : un jour d'écart y reste pour toujours, et il n'y a
   * pas d'avoir pour corriger une date.
   */
  private asInstant(date: Date): string {
    return date.toISOString();
  }

  private run(
    call: import('rxjs').Observable<Invoice>,
    success: string,
    then?: () => void,
  ): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.message.set(null);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.message.set(success);
        then?.();
        this.load(this.organizationId());
        this.changed.emit();
      },
      error: (error) => {
        this.busy.set(false);
        // **Le refus du serveur s'affiche tel quel** : lui seul sait qu'un règlement dépasse le
        // restant dû, qu'une facture est déjà corrigée, ou que la fiscalité d'un client n'est pas
        // tranchée. Un message générique perdrait exactement ce qui aide à corriger.
        this.actionError.set(error?.error?.message ?? error?.error?.detail ?? "L'opération a échoué.");
      },
    });
  }

  private load(organizationId: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.invoiceService.list(organizationId).subscribe({
      next: (result) => {
        this.invoices.set(result.items);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les factures de ce client.');
        this.loading.set(false);
      },
    });
  }
}
