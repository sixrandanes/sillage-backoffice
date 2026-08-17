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
