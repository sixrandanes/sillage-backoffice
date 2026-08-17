import { Territory } from '../tax/models';

export interface SalonAdmin {
  id: number;
  organizationId: number;
  organizationName: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  territory: Territory;
  taxName: string;
  /**
   * Fuseau du territoire, en IANA. **Pas décoratif** : entre Nouméa et Papeete il y a vingt et une
   * heures, donc un même instant n'y tombe pas le même **jour**. Toute date de ce salon se met en
   * forme avec, jamais avec celui du navigateur.
   */
  zoneId: string;
  createdAt: string;
}

export interface SalonAdminCreateRequest {
  organizationId: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  territory: Territory;
}

export interface SalonAdminUpdateRequest {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  territory: Territory;
  active: boolean;
}
