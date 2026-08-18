export interface OrganizationAdmin {
  id: number;
  name: string;
  taxCountry: string;
  currency: string;
  /**
   * L'adresse et le RIDET qui figurent sur les factures d'abonnement.
   *
   * `null` tant qu'ils n'ont pas été saisis — et **aucune facture ne peut être émise sans eux** :
   * une pièce sans ces mentions n'est pas conforme, et son numéro serait consommé. Le propriétaire
   * peut les renseigner lui-même ; le support est là pour corriger.
   */
  billingAddress: string | null;
  taxId: string | null;
  active: boolean;
  salonCount: number;
  createdAt: string;
}

export interface OrganizationAdminUpdateRequest {
  name: string;
  taxCountry: string;
  billingAddress: string;
  taxId: string;
  active: boolean;
}
