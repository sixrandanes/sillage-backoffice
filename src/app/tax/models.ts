export enum TaxRegime {
  TGC = 'TGC',
  TVA_PF = 'TVA_PF',
}

export enum TaxCategory {
  EXEMPT = 'EXEMPT',
  REDUCED = 'REDUCED',
  INTERMEDIATE = 'INTERMEDIATE',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export interface TaxRateInfo {
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
