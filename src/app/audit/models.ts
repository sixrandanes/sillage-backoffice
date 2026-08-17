export type AuditFamily = 'PLATFORM_ACCESS' | 'CLIENT_ACCESS' | 'BILLING' | 'STRUCTURE' | 'TAX';

/**
 * Une ligne du journal d'administration.
 *
 * `subjectLabel` et `details` sont **figés au moment du geste** : recalculés depuis les tables, ils
 * diraient le nom d'aujourd'hui — et c'est précisément quand un nom a changé qu'on vient relire le
 * journal.
 */
export interface AuditEntry {
  id: number;
  occurredAt: string;
  actorLabel: string;
  action: string;
  actionLabel: string;
  family: AuditFamily;
  familyLabel: string;
  organizationId: number | null;
  subjectLabel: string | null;
  details: string | null;
}

export interface FamilyOption {
  value: AuditFamily;
  label: string;
}

/**
 * Ce qui est en jeu.
 *
 * Les deux familles d'accès ouvrent ou ferment des portes sur des données ; les autres non. Les
 * peindre pareil ferait perdre la seule distinction qu'on vient chercher devant un incident.
 */
export function familySeverity(family: AuditFamily): 'access' | 'ordinary' {
  return family === 'PLATFORM_ACCESS' || family === 'CLIENT_ACCESS' ? 'access' : 'ordinary';
}
