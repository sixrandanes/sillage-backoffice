import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { BillingPeriod, SubscriptionAdminView, SubscriptionOptions, SubscriptionPlan } from './models';

/**
 * L'administration des abonnements, côté plateforme.
 *
 * Chaque geste a sa route parce qu'il a sa règle : prolonger n'est pas couvrir, reconduire n'est
 * pas poser une date. Un `PUT` unique sur l'abonnement les aurait confondus dans un corps où
 * n'importe quelle combinaison de champs devient exprimable, y compris celles que le serveur
 * refuse.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);

  private readonly base = `${API}/platform/subscriptions`;

  overview(): Observable<SubscriptionAdminView[]> {
    return this.http.get<SubscriptionAdminView[]>(this.base);
  }

  /** Les échéances proches — et celles déjà dépassées, qui demandent une action plus urgente. */
  expiring(days: number): Observable<SubscriptionAdminView[]> {
    return this.http.get<SubscriptionAdminView[]>(`${this.base}/expiring`, {
      params: new HttpParams().set('days', days),
    });
  }

  options(): Observable<SubscriptionOptions> {
    return this.http.get<SubscriptionOptions>(`${this.base}/options`);
  }

  extendTrial(organizationId: number, days: number): Observable<SubscriptionAdminView> {
    return this.http.post<SubscriptionAdminView>(
      `${this.base}/${organizationId}/extend-trial`,
      { days },
    );
  }

  cover(
    organizationId: number,
    through: string,
    billingPeriod: BillingPeriod | null,
  ): Observable<SubscriptionAdminView> {
    return this.http.post<SubscriptionAdminView>(`${this.base}/${organizationId}/cover`, {
      through,
      billingPeriod,
    });
  }

  /**
   * Rattache l'offre souscrite.
   *
   * Accepte une offre terminée, contrairement à la souscription publique : le support doit pouvoir
   * **constater** qu'un client est resté sur un ancien tarif, alors que la vitrine ne doit pas le
   * **vendre**.
   */
  changeOffer(organizationId: number, offerCode: string): Observable<SubscriptionAdminView> {
    return this.http.post<SubscriptionAdminView>(`${this.base}/${organizationId}/offer`, {
      offerCode,
    });
  }

  renew(organizationId: number): Observable<SubscriptionAdminView> {
    return this.http.post<SubscriptionAdminView>(`${this.base}/${organizationId}/renew`, {});
  }

  changePlan(organizationId: number, plan: SubscriptionPlan): Observable<SubscriptionAdminView> {
    return this.http.post<SubscriptionAdminView>(`${this.base}/${organizationId}/plan`, { plan });
  }

  /** Arrête la reconduction. Ne coupe aucun accès et ne supprime aucun salon. */
  cancel(organizationId: number): Observable<SubscriptionAdminView> {
    return this.http.post<SubscriptionAdminView>(`${this.base}/${organizationId}/cancel`, {});
  }

  resume(organizationId: number): Observable<SubscriptionAdminView> {
    return this.http.post<SubscriptionAdminView>(`${this.base}/${organizationId}/resume`, {});
  }
}
