import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { PageResponse } from '../core/http/page';
import { Invoice, InvoicePaymentMethod } from './models';

/**
 * Les factures d'abonnement.
 *
 * **Aucune méthode de modification ni de suppression, et il ne doit jamais y en avoir** : une
 * facture erronée se corrige par un avoir. Une route `PUT` sur une pièce numérotée suffirait à ôter
 * à la série toute valeur probante.
 */
@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);

  list(organizationId: number, page = 0, size = 10): Observable<PageResponse<Invoice>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<Invoice>>(
      `${API}/platform/organizations/${organizationId}/invoices`,
      { params },
    );
  }

  /**
   * Émet la facture d'une période.
   *
   * **Aucune date n'est devinée ici** : la période couverte est ce que l'exploitant saisit, et le
   * serveur fige le reste. Recalculer un terme côté client le ferait diverger du serveur au premier
   * règlement qui prolonge la couverture.
   */
  issue(organizationId: number, periodStart: string, periodEnd: string): Observable<Invoice> {
    return this.http.post<Invoice>(
      `${API}/platform/organizations/${organizationId}/invoices`,
      { periodStart, periodEnd },
    );
  }

  creditNote(invoiceId: number, reason: string | null): Observable<Invoice> {
    return this.http.post<Invoice>(`${API}/platform/invoices/${invoiceId}/credit-note`, { reason });
  }

  recordPayment(
    invoiceId: number,
    amount: string,
    method: InvoicePaymentMethod,
    paidAt: string | null,
    reference: string | null,
  ): Observable<Invoice> {
    return this.http.post<Invoice>(`${API}/platform/invoices/${invoiceId}/payments`, {
      amount,
      method,
      paidAt,
      reference,
    });
  }
}
