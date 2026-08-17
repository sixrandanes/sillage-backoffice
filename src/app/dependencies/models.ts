/** Ce qu'on peut dire d'une dépendance **sans la sonder** — voir `dependencies.service.ts`. */
export type DependencyStatus =
  | 'JAMAIS_APPELEE'
  | 'OPERATIONNELLE'
  | 'DEGRADEE'
  | 'EN_PANNE';

/**
 * L'état d'un service extérieur.
 *
 * `statut` distingue **quatre** cas là où un booléen n'en dirait que deux. Le cas qui compte est
 * `JAMAIS_APPELEE` : une dépendance qu'aucun appel n'a touchée n'est pas saine, elle est
 * **inconnue** — et c'est exactement l'état d'une intégration qu'on croit avoir câblée et qui ne
 * l'est pas.
 */
export interface DependencyState {
  code: string;
  libelle: string;
  /** Ce qui cesse de fonctionner quand elle tombe : la seule chose utile à lire dans l'urgence. */
  usage: string;
  statut: DependencyStatus;
  appels: number;
  echecs: number;
  dureeMoyenneMs: number | null;
  dernierEchec: string | null;
  dernierSucces: string | null;
  /** Ce que la dépendance a répondu la dernière fois qu'elle a refusé. */
  derniereCause: string | null;
}

export interface DependencyFailure {
  dependance: string;
  operation: string;
  cible: string | null;
  cause: string | null;
  quand: string;
}

export interface DependencyHealth {
  jours: number;
  depuis: string;
  dependances: DependencyState[];
  derniersEchecs: DependencyFailure[];
}
