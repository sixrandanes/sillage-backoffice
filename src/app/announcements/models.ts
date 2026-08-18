/**
 * Un message adressé à **tous** les salons, pendant une période donnée.
 *
 * <p><b>La période n'est pas un réglage, c'est le dispositif.</b> Un message qu'on allume et qu'on
 * éteint à la main reste affiché le jour où personne n'y pense — et un encadré permanent, on apprend
 * à ne plus le lire, ce qui coûte plus cher que de n'avoir rien affiché.
 */
export type AnnouncementLevel = 'INFO' | 'WARNING' | 'CRITICAL';

/** Calculé par le serveur, jamais ici : la règle « en cours » ne doit exister qu'à un endroit. */
export type AnnouncementStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED';

export interface AnnouncementView {
  id: number;
  message: string;
  level: AnnouncementLevel;
  /** Le libellé vient du serveur, comme celui des natures de geste du journal. */
  levelLabel: string;
  startsAt: string;
  endsAt: string;
  status: AnnouncementStatus;
  statusLabel: string;
  /** Figé à la rédaction : l'auteur doit rester lisible après son départ de l'équipe. */
  createdBy: string | null;
  createdAt: string;
}

export interface AnnouncementRequest {
  message: string;
  level: AnnouncementLevel;
  startsAt: string;
  endsAt: string;
}
