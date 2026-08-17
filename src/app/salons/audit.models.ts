/**
 * Une écriture du journal de caisse d'un salon.
 *
 * `sequenceNumber` et `hash` viennent du grand livre : c'est la **continuité des numéros** qui
 * détecte une suppression, et l'empreinte qui détecte une altération. Les afficher n'est pas
 * décoratif — devant un litige, c'est ce qui permet de dire qu'une ligne n'a pas été escamotée.
 */
export interface SalonAuditEntry {
  id: number;
  sequenceNumber: number;
  action: string;
  actionLabel: string;
  entityType: string | null;
  entityId: number | null;
  actor: string;
  details: string | null;
  occurredAt: string;
  hash: string;
}

export interface AuditActionOption {
  value: string;
  label: string;
}

export interface SalonAuditQuery {
  action?: string | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
  page?: number;
  size?: number;
}

/**
 * Résultat du rejeu d'une chaîne d'écritures.
 *
 * Le rejeu ne recalcule pas seulement les empreintes : il contrôle le **chaînage** (chaque écriture
 * pointe bien la précédente) et la **continuité de la numérotation**. Une écriture supprimée laisse
 * toutes les empreintes intactes — seul le trou dans la séquence la trahit.
 */
export interface ChainVerification {
  chain: string;
  entryCount: number;
  intact: boolean;
  anomalies: { position: number; problem: string }[];
}

/**
 * Verdict d'intégrité d'un salon.
 *
 * `intact` n'est vrai que si **toutes** les chaînes le sont : une seule anomalie compromet la
 * valeur probante de l'ensemble, il n'y a pas de demi-mesure à afficher.
 */
export interface IntegrityReport {
  salonId: number;
  intact: boolean;
  /**
   * Tout l'historique a-t-il été rejoué écriture par écriture ? Sinon le rejeu s'est ancré sur le
   * dernier exercice archivé, les précédents étant confrontés à leurs archives.
   */
  full: boolean;
  /**
   * Ce sur quoi le verdict porte, rédigé par le serveur. **À afficher partout où le verdict l'est**
   * : « aucune altération détectée » ne dit pas la même chose selon la portée, et laisser deviner
   * reviendrait à annoncer une garantie que personne n'a demandée.
   */
  scope: string;
  chains: ChainVerification[];
}
