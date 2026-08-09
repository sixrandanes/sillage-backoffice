import { TaxRegime } from '../tax/models';

export interface SalonAdmin {
  id: number;
  organizationId: number;
  organizationName: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  taxRegime: TaxRegime;
  taxName: string;
  createdAt: string;
}

export interface SalonAdminCreateRequest {
  organizationId: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxRegime: TaxRegime;
}

export interface SalonAdminUpdateRequest {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxRegime: TaxRegime;
  active: boolean;
}
