import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Invoice } from '../models';
import { InvoicesPanel } from './invoices-panel';

const LIST = '/api/v1/platform/organizations/7/invoices?page=0&size=10';

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 42,
    number: 'F2026-0007',
    type: 'INVOICE',
    typeLabel: 'Facture',
    correctedInvoiceNumber: null,
    organizationId: 7,
    clientName: 'Salon des Cocotiers',
    issuedAt: '2026-08-01T00:00:00Z',
    periodStart: '2026-08-01T00:00:00Z',
    periodEnd: '2026-08-31T00:00:00Z',
    offerCode: 'SOLO_M',
    offerLabel: 'Solo mensuel',
    plan: 'SOLO',
    billingPeriod: 'MONTHLY',
    baseAmount: '5000',
    discountRate: null,
    discountAmount: '0',
    netAmount: '5000',
    taxRate: '0.1100',
    taxAmount: '550',
    totalAmount: '5550',
    currency: 'XPF',
    paidAmount: '0',
    remainingAmount: '5550',
    status: 'DUE',
    hash: 'a'.repeat(64),
    ...overrides,
  };
}

describe('InvoicesPanel', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvoicesPanel],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(rows: Invoice[] = [invoice()]) {
    const fixture = TestBed.createComponent(InvoicesPanel);
    fixture.componentRef.setInput('organizationId', 7);
    fixture.detectChanges();
    http.expectOne(LIST).flush({ items: rows, totalItems: rows.length, page: 0, size: 10 });
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  /**
   * **Aucun geste de modification ni de suppression, et ce n'est pas un oubli.** Une facture
   * erronée se corrige par un avoir ; un bouton « modifier » sur une pièce numérotée ôterait à la
   * série toute valeur probante. Ce test est ce qui l'empêche de réapparaître « pour dépanner ».
   */
  it('never offers to edit or delete a numbered document', () => {
    const { fixture } = create();
    const libelles: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).map((bouton) => (bouton as HTMLButtonElement).textContent?.trim().toLowerCase() ?? '');

    expect(libelles.some((libelle) => libelle.includes('modifier'))).toBe(false);
    expect(libelles.some((libelle) => libelle.includes('supprimer'))).toBe(false);
    expect(libelles.some((libelle) => libelle.includes('avoir'))).toBe(true);
  });

  /** Un avoir n'attend aucun argent : proposer de le régler serait proposer un geste voué au refus. */
  it('does not offer to settle a credit note', () => {
    const { component } = create();

    expect(component.canBePaid(invoice({ type: 'CREDIT_NOTE', status: 'CREDIT_NOTE' }))).toBe(false);
    expect(component.canBeCredited(invoice({ type: 'CREDIT_NOTE' }))).toBe(false);
    expect(component.canBePaid(invoice({ status: 'PAID' }))).toBe(false);
    expect(component.canBePaid(invoice())).toBe(true);
  });

  /**
   * **Le reste dû vient du serveur, il n'est jamais recalculé ici.** Il se dérive des règlements ;
   * le refaire côté client ferait diverger les deux au premier règlement partiel — et c'est le
   * chiffre qu'on annonce au téléphone.
   */
  it('prefills a payment with what the server says is still owed', () => {
    const { component } = create([invoice({ status: 'PARTIALLY_PAID', paidAmount: '2000', remainingAmount: '3550' })]);

    component.openPayment(component.invoices()[0]);

    expect(component.paymentForm.getRawValue().amount).toBe('3550');
  });

  /**
   * **Le refus du serveur s'affiche tel quel.** Lui seul sait qu'un règlement dépasse le restant
   * dû, qu'une facture est déjà corrigée, ou que la fiscalité d'un client n'est pas tranchée. Un
   * message générique perdrait exactement ce qui aide à corriger.
   */
  it('shows the server refusal verbatim rather than a generic message', () => {
    const { fixture, component } = create();

    component.openPayment(component.invoices()[0]);
    component.recordPayment();
    http.expectOne('/api/v1/platform/invoices/42/payments').flush(
      { message: 'Ce règlement dépasse le montant restant dû (3 550 XPF).' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(component.actionError()).toContain('dépasse le montant restant dû');
  });

  it('emits a credit note against the invoice it corrects', () => {
    const { component } = create();

    component.creditNote(component.invoices()[0], 'Erreur de palier');

    const requete = http.expectOne('/api/v1/platform/invoices/42/credit-note');
    expect(requete.request.body).toEqual({ reason: 'Erreur de palier' });
    requete.flush(invoice({ id: 43, number: 'A2026-0001', type: 'CREDIT_NOTE' }));
    http.expectOne(LIST).flush({ items: [], totalItems: 0, page: 0, size: 10 });
  });

  /** Une remise se lit par son montant ; son motif est interne et n'a rien à faire sur la pièce. */
  it('shows the discount amount but never an internal reason', () => {
    const { fixture } = create([invoice({ discountRate: '0.2000', discountAmount: '1000' })]);

    expect(fixture.nativeElement.textContent).toContain('remise appliquée');
    expect(fixture.nativeElement.textContent).not.toContain('motif');
  });
});
