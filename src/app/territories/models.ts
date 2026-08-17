import { TaxRegime } from '../tax/models';

/**
 * Un territoire et son ouverture commerciale.
 *
 * Sépare **ce que le code sait faire** de **ce qu'on vend** : le produit sait taxer en TVA
 * polynésienne bien avant qu'on veuille y vendre.
 */
export interface Territory {
  regime: TaxRegime;
  territoryCode: string;
  territoryLabel: string;
  taxName: string;
  open: boolean;
}
