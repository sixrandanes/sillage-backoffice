import { SubscriptionStatus } from '../subscriptions/models';
import { Territory } from '../tax/models';

/**
 * L'état de la plateforme.
 *
 * **Trois natures de chiffres qu'il ne faut pas mélanger.** Le *stock* dit où l'on en est
 * aujourd'hui, le *mouvement* ce qui a bougé sur une période, et les *rapports* ce qui demande une
 * action. Les afficher côte à côte sans le dire ferait lire un total comme une progression.
 */
export interface PlatformOverview {
  stock: Stock;
  mouvement: Mouvement;
  rapports: Rapports;
}

export interface Stock {
  organisations: number;
  organisationsActives: number;
  /** Tous les statuts figurent, y compris à zéro : un statut absent se lirait comme une donnée manquante. */
  abonnementsParStatut: Record<SubscriptionStatus, number>;
  salons: number;
  salonsActifs: number;
  salonsActifsParTerritoire: Record<Territory, number>;
  revenu: Revenu;
}

/**
 * **« Revenu contractualisé », jamais « chiffre d'affaires ».** Rien n'est encore facturé : ce sont
 * des engagements, pas des recettes. Les confondre ferait lire un résultat qui n'existe pas — même
 * exigence que l'encours de bons cadeaux côté frontoffice, présenté comme une dette.
 */
export interface Revenu {
  mensuel: number;
  annuel: number;
  /** Ce que rapporteraient les essais s'ils se convertissaient tous. Un potentiel, pas une recette. */
  enEssai: number;
  /** La part du mensuel portée par des abonnements résiliés : une baisse déjà décidée. */
  dontResilie: number;
  remisesAccordees: number;
}

export interface Mouvement {
  jours: number;
  inscriptions: Evolution;
  resiliations: Evolution;
  salonsOuverts: Evolution;
  reglementsEnregistres: Evolution;
}

/**
 * Une grandeur et ce qu'elle valait sur la période précédente.
 *
 * La variation n'est pas calculée côté serveur, et c'est délibéré : **une progression depuis zéro
 * n'est pas « +100 % »**, c'est un démarrage. L'écran doit pouvoir le dire plutôt qu'afficher un
 * pourcentage qui ne veut rien dire.
 */
export interface Evolution {
  periode: number;
  precedente: number;
}

export interface Rapports {
  bloques: Rapport;
  aEcheance: Rapport;
  essaisNonConvertis: Rapport;
  sansAccesProprietaire: Rapport;
  sansSalon: Rapport;
  sansVente: Rapport;
  sansOffre: Rapport;
}

/** Le compte dit l'ampleur, les noms permettent de commencer sans ouvrir un autre écran. */
export interface Rapport {
  total: number;
  exemples: string[];
}
