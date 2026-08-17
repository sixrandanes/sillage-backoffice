import { BillingPeriod, PlanOption, SubscriptionPlan } from '../subscriptions/models';

export type { BillingPeriod, PlanOption, SubscriptionPlan };

export type OfferStatus = 'SCHEDULED' | 'AVAILABLE' | 'ENDED';

/**
 * Une offre commerciale.
 *
 * Les trois montants dérivés (`monthlyEquivalent`, `impliedMonthlyPrice`, `firstYearCost`) viennent
 * du serveur : une grille où l'on ne voit que le prix par période n'est pas comparable, et les
 * recalculer ici les ferait diverger au premier ajustement d'arrondi.
 */
export interface Offer {
  id: number;
  code: string;
  label: string;
  plan: SubscriptionPlan;
  planLabel: string;
  maxActiveSalons: number;
  billingPeriod: BillingPeriod;
  billingPeriodLabel: string;
  price: string;
  setupFee: string | null;
  freeMonths: number;
  trialDays: number;
  validFrom: string;
  validTo: string | null;
  status: OfferStatus;
  statusLabel: string;
  /** Ce que l'année coûte réellement par mois, mois offerts compris. */
  monthlyEquivalent: string;
  /** Le tarif mensuel auquel ce prix annuel correspond, mois offerts déduits. `null` si mensuelle. */
  impliedMonthlyPrice: string | null;
  /** Ce qu'un nouveau client débourse la première année, installation comprise. */
  firstYearCost: string;
}

export interface OfferRequest {
  code: string;
  label: string;
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod;
  price: number;
  setupFee: number | null;
  freeMonths: number;
  trialDays: number;
  validFrom: string;
  validTo: string | null;
}

/** Ce qui est proposé aujourd'hui, ce qui l'a été, ce qui le sera. */
export function offerSeverity(status: OfferStatus): 'available' | 'scheduled' | 'ended' {
  switch (status) {
    case 'AVAILABLE':
      return 'available';
    case 'SCHEDULED':
      return 'scheduled';
    default:
      return 'ended';
  }
}
