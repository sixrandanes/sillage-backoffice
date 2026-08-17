export type SubscriptionPlan = 'SOLO' | 'MULTI';

export type BillingPeriod = 'MONTHLY' | 'YEARLY';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'TRIAL_ENDED' | 'LAPSED' | 'CANCELLED';

/**
 * Une ligne de l'état des lieux.
 *
 * `accessUntil` est la date qu'on vient réellement lire — fin d'essai tant que rien n'est payé,
 * fin de couverture ensuite. Elle vient du serveur plutôt que d'être recalculée ici : la déduire
 * des trois autres dates finirait par la déduire autrement que `Subscription#accessUntil`.
 */
export interface SubscriptionAdminView {
  organizationId: number;
  organizationName: string;
  organizationActive: boolean;
  plan: SubscriptionPlan;
  planLabel: string;
  /**
   * L'offre souscrite. `null` sur les abonnements antérieurs à la grille tarifaire — et c'est
   * précisément ce que l'écran doit montrer, pour qu'on sache lesquels restent à rattacher.
   */
  offerCode: string | null;
  offerLabel: string | null;
  billingPeriod: BillingPeriod | null;
  status: SubscriptionStatus;
  statusLabel: string;
  trialEndsAt: string;
  paidThrough: string | null;
  cancelledAt: string | null;
  accessUntil: string;
  activeSalons: number;
}

export interface PlanOption {
  value: SubscriptionPlan;
  label: string;
  maxActiveSalons: number;
}

export interface PeriodOption {
  value: BillingPeriod;
  label: string;
}

/**
 * Les libellés et le plafond de chaque offre viennent du serveur.
 *
 * Recopiés ici, ils divergeraient au premier changement de nom d'offre — et l'écran afficherait
 * alors autre chose que ce qu'il envoie, sans qu'aucun appel n'échoue. Même règle que les moyens
 * de paiement et les natures de geste d'audit.
 */
export interface SubscriptionOptions {
  plans: PlanOption[];
  periods: PeriodOption[];
}

/**
 * Ce que dit un statut, au-delà de son libellé : est-ce que ça demande une action ?
 *
 * `LAPSED` et `TRIAL_ENDED` sont les deux seuls états où **la caisse du client est fermée**. Les
 * afficher du même gris que les autres reviendrait à cacher la seule chose que cet écran existe
 * pour montrer.
 */
export function statusSeverity(status: SubscriptionStatus): 'blocked' | 'running' | 'ended' {
  switch (status) {
    case 'TRIAL_ENDED':
    case 'LAPSED':
      return 'blocked';
    case 'CANCELLED':
      return 'ended';
    default:
      return 'running';
  }
}
