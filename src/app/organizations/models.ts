export interface OrganizationAdmin {
  id: number;
  name: string;
  taxCountry: string;
  currency: string;
  active: boolean;
  salonCount: number;
  createdAt: string;
}

export interface OrganizationAdminUpdateRequest {
  name: string;
  taxCountry: string;
  active: boolean;
}
