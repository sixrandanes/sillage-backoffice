export enum TaxRegime {
  TGC = 'TGC',
  TVA_PF = 'TVA_PF',
}

/**
 * Le code d'une tranche.
 *
 * **Ce n'est plus un `enum`** : les tranches sont des donnees cote serveur, et le backoffice est
 * precisement l'endroit d'ou l'on en cree. Un `enum` ici aurait rendu impossible d'afficher la
 * tranche qu'on vient de creer.
 */
export type TaxCategory = string;

/** Le vocabulaire des tranches, commun aux deux regimes. */
export interface TaxCategoryInfo {
  code: string;
  label: string;
  position: number;
}

export interface TaxRateInfo {
  /** Necessaire pour corriger ou annuler un taux programme : il faut pouvoir le designer. */
  id: number;
  category: TaxCategory;
  label: string;
  rate: number;
  validFrom: string;
  validTo: string | null;
}

export interface TaxRegimeInfo {
  regime: TaxRegime;
  territoryCode: string;
  territoryLabel: string;
  taxName: string;
  taxLabel: string;
  rates: TaxRateInfo[];
}

export interface ScheduleRateRequest {
  category: TaxCategory;
  rate: number;
  label: string;
  validFrom: string;
}

export interface TaxCategoryRequest {
  code: string;
  label: string;
  position: number;
}

export interface CloseRateRequest {
  closesOn: string;
}
