import { TaxRegime } from '../tax/models';

/**
 * Un territoire, et ce qu'il determine.
 *
 * <p><b>Ce n'est pas un detail de la fiscalite</b>, et le modele le disait mal : il ne portait qu'un
 * libelle, un nom de taxe et un interrupteur. Un territoire determine aussi le **fuseau horaire**
 * qui decoupe les journees comptables — plus de vingt heures separent Nouméa de Papeete, donc un
 * meme instant n'y tombe pas le meme jour — et il porte un nombre d'**etablissements en activite**,
 * qui est precisement ce qu'il faut savoir avant de fermer.
 */
export interface Territory {
  /** Identifiant du regime fiscal, heritage du nom : c'est la cle du territoire. */
  regime: TaxRegime;
  territoryCode: string;
  territoryLabel: string;
  taxName: string;
  taxLabel: string;
  /** Identifiant IANA, ex. `Pacific/Noumea`. Le serveur donne le fait, le client le met en forme. */
  zoneId: string;
  /** Salons actifs qui y operent — ce que fermer ne suspendra pas. */
  activeSalons: number;
  open: boolean;
}
