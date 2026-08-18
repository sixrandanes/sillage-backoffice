import { Territory } from '../tax/models';

/**
 * Un territoire, et ce qu'il determine.
 *
 * <p><b>Ce n'est pas un detail de la fiscalite</b>, et le modele le disait mal : il ne portait qu'un
 * libelle, un nom de taxe et un interrupteur. Un territoire determine aussi le **fuseau horaire**
 * qui decoupe les journees comptables — plus de vingt heures separent Nouméa de Papeete, donc un
 * meme instant n'y tombe pas le meme jour — et il porte un nombre d'**etablissements en activite**,
 * qui est precisement ce qu'il faut savoir avant de fermer.
 */
export interface TerritoryView {
  /**
   * La clé du territoire, reprise telle quelle pour l'ouvrir ou le fermer.
   *
   * **Le serveur l'a longtemps publiée sous le nom `regime`**, reliquat d'avant le renommage,
   * pendant que ce modèle lisait déjà `territory` : la clé était donc `undefined` et l'ouverture
   * partait vers `/platform/territories/undefined`. Ce modèle avait raison, le serveur avait
   * dérivé — et **aucun spec d'ici ne pouvait le voir**, puisque leurs décors sont écrits d'après
   * ce modèle. Un contrat d'API ne se vérifie que sur le JSON réellement émis, donc côté serveur.
   */
  territory: Territory;
  territoryCode: string;
  territoryLabel: string;
  taxName: string;
  /** Identifiant IANA, ex. `Pacific/Noumea`. Le serveur donne le fait, le client le met en forme. */
  zoneId: string;
  /** Salons actifs qui y operent — ce que fermer ne suspendra pas. */
  activeSalons: number;
  open: boolean;
}
