/**
 * Un compte du backoffice.
 *
 * `canConnect` n'est pas une redondance de `active` : une fiche peut être active et pourtant
 * inerte, faute d'identifiant du fournisseur. Les confondre à l'écran ferait croire l'accès ouvert,
 * et on chercherait la panne ailleurs — chez le fournisseur, dans le navigateur, partout sauf ici.
 */
export interface PlatformAdmin {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  /** Le `sub` du fournisseur. `null` tant que la personne ne s'est pas présentée une fois. */
  externalId: string | null;
  active: boolean;
  canConnect: boolean;
  /** Le compte de celui qui regarde — à dire avant qu'il ne se désactive lui-même. */
  self: boolean;
  createdAt: string;
}

export interface PlatformAdminRequest {
  email: string;
  firstName: string;
  lastName: string;
  externalId: string | null;
}

/** L'état d'un compte, en une phrase, dans l'ordre où il faut le lire. */
export function adminState(admin: PlatformAdmin): {
  label: string;
  severity: 'ok' | 'pending' | 'off';
} {
  if (!admin.active) {
    return { label: 'Désactivé', severity: 'off' };
  }
  if (!admin.externalId) {
    return { label: 'En attente de rattachement', severity: 'pending' };
  }
  return { label: 'Actif', severity: 'ok' };
}
