/**
 * Une archive fiscale scellée, sans son contenu.
 *
 * L'historique s'affiche sans charger plusieurs Mo : le fichier ne descend qu'au téléchargement.
 */
export interface SalonArchive {
  id: number;
  archiveNumber: number;
  businessYear: number;
  saleCount: number;
  refundCount: number;
  closureCount: number;
  auditEntryCount: number;
  netAmount: string;
  taxAmount: string;
  /**
   * Le grand livre était-il intact au scellement ?
   *
   * `null` sur une archive antérieure à ce contrôle — écrire « vérifiée » affirmerait un contrôle
   * qui n'a pas eu lieu, et c'est justement la phrase qu'on ne peut pas se permettre ici.
   */
  integrityVerified: boolean | null;
  integrityAnomalies: number | null;
  contentLength: number;
  /** L'empreinte qu'on rapproche d'un fichier ressorti d'un coffre. */
  contentHash: string;
  createdAt: string;
}

/**
 * Ce qui n'a jamais été scellé.
 *
 * `years` vide **ne veut pas dire** « rien à archiver » de la même façon qu'une liste d'archives
 * vide : la première dit que tout est en règle, la seconde que personne n'a jamais rien fait.
 */
export interface PendingArchives {
  years: number[];
  oldest: number | null;
}
