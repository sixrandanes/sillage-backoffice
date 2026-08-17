import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CloseRateRequest, ScheduleRateRequest, TaxCategoryInfo, TaxCategoryRequest, TaxRateInfo, TaxRegime, TaxRegimeInfo } from './models';
import { API } from '../core/api';

/**
 * Version admin du referentiel fiscal (nc.kaimana.tax.TaxAdminController cote backend),
 * separee du TaxService "lecture seule" du frontend tenant : celui-ci vit sous /api/tax et
 * sur la chaine de securite tenant, inaccessible avec un jeton plateforme (voir SecurityConfig
 * cote backend). Ce service parle exclusivement a /api/v1/platform/tax.
 */
@Injectable({ providedIn: 'root' })
export class TaxService {
  private readonly http = inject(HttpClient);

  /**
   * La grille de chaque regime, **a la date demandee**.
   *
   * <p>Sans date, c'est aujourd'hui. Le parametre donne la lecture « par blocs » que reclame
   * l'administration du bareme — ce qui s'appliquait l'an dernier, ce qui s'appliquera au
   * 1er janvier — sans qu'aucun bloc ne soit stocke : les intervalles portent deja l'information.
   */
  regimes(on?: string): Observable<TaxRegimeInfo[]> {
    const params = on ? new HttpParams().set('on', on) : undefined;
    return this.http.get<TaxRegimeInfo[]>(`${API}/platform/tax/regimes`, { params });
  }

  history(regime: TaxRegime): Observable<TaxRateInfo[]> {
    return this.http.get<TaxRateInfo[]>(`${API}/platform/tax/regimes/${regime}/history`);
  }

  scheduleRate(regime: TaxRegime, request: ScheduleRateRequest): Observable<TaxRateInfo> {
    return this.http.post<TaxRateInfo>(`${API}/platform/tax/regimes/${regime}/rates`, request);
  }

  // ── Les tranches, communes aux deux regimes ────────────────────────────────────────────

  categories(): Observable<TaxCategoryInfo[]> {
    return this.http.get<TaxCategoryInfo[]>(`${API}/platform/tax/categories`);
  }

  /** Cree une tranche. Elle ne s'applique nulle part tant qu'aucun taux ne lui est ouvert. */
  createCategory(request: TaxCategoryRequest): Observable<TaxCategoryInfo> {
    return this.http.post<TaxCategoryInfo>(`${API}/platform/tax/categories`, request);
  }

  /** Refuse tant qu'un taux ou un produit la porte — le serveur dit lequel et combien. */
  deleteCategory(code: string): Observable<void> {
    return this.http.delete<void>(`${API}/platform/tax/categories/${code}`);
  }

  // ── Les taux, propres a chaque regime ──────────────────────────────────────────────────

  /** Ouvre une tranche la ou ce regime n'en avait pas : « ajouter » vu du territoire. */
  openRate(regime: TaxRegime, request: ScheduleRateRequest): Observable<TaxRateInfo> {
    return this.http.post<TaxRateInfo>(`${API}/platform/tax/regimes/${regime}/rates/open`, request);
  }

  /** Fait cesser une tranche de s'appliquer : « supprimer », sans rien effacer. */
  closeRate(regime: TaxRegime, category: string, request: CloseRateRequest): Observable<TaxRateInfo> {
    return this.http.post<TaxRateInfo>(
      `${API}/platform/tax/regimes/${regime}/rates/${category}/close`, request);
  }

  /** Corrige un taux **tant qu'il n'a pas pris effet**. Au-dela, le serveur refuse. */
  amendRate(id: number, request: ScheduleRateRequest): Observable<TaxRateInfo> {
    return this.http.put<TaxRateInfo>(`${API}/platform/tax/rates/${id}`, request);
  }

  /** Annule un taux programme ; le serveur rouvre celui qu'il devait remplacer. */
  cancelRate(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/platform/tax/rates/${id}`);
  }
}
