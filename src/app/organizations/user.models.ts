export type Role = 'OWNER' | 'MANAGER' | 'STAFF' | 'ACCOUNTANT';

/**
 * Les rôles portent des libellés français, comme côté frontoffice.
 *
 * Recopiés d'un projet à l'autre plutôt que partagés : les deux applications sont délibérément
 * sans code commun (voir `CLAUDE.md`). Le prix est cette table ; le bénéfice est qu'aucun point de
 * couplage n'existe entre le monde client et le monde plateforme.
 */
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Propriétaire du salon',
  MANAGER: 'Gérant·e',
  STAFF: 'Salarié·e',
  ACCOUNTANT: 'Comptable',
};

export type AccessState = 'ORGANIZATION_DISABLED' | 'ACCOUNT_DISABLED' | 'AWAITING_LINK' | 'OK';

export interface SalonRole {
  salonId: number;
  salonName: string;
  role: Role;
}

/**
 * Un compte client, vu depuis le support.
 *
 * `access` est le champ qu'on vient lire : l'appel commence par « ça ne marche plus », et ce
 * diagnostic est la différence entre voir la liste et comprendre. Son libellé vient du serveur.
 *
 * `linked` dit qu'une identité est attachée, sans en donner la valeur — la réparation consiste à
 * la détacher, jamais à en retaper une.
 */
export interface UserAdmin {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  organizationOwner: boolean;
  linked: boolean;
  access: AccessState;
  accessLabel: string;
  salonRoles: SalonRole[];
}

/** Ce qui demande une action, ce qui se règle tout seul, et ce qui va bien. */
export function accessSeverity(access: AccessState): 'blocked' | 'waiting' | 'ok' {
  switch (access) {
    case 'ORGANIZATION_DISABLED':
    case 'ACCOUNT_DISABLED':
      return 'blocked';
    case 'AWAITING_LINK':
      return 'waiting';
    default:
      return 'ok';
  }
}
