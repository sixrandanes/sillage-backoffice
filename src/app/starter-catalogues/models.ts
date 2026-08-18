/**
 * Un métier de démarrage et ses prestations suggérées.
 *
 * <p><b>Des suggestions, pas des références</b> : les prestations créées à partir d'elles sont des
 * copies dans le catalogue du client. Modifier ou supprimer une ligne ici ne touche jamais un
 * salon existant — c'est ce qui rend l'édition libre, là où offres et taux figent.
 */
export interface StarterActivity {
  id: number;
  label: string;
  services: StarterService[];
}

export interface StarterService {
  id: number;
  name: string;
  durationMinutes: number;
  price: number;
  taxCategory: string;
}

export interface StarterServiceRequest {
  name: string;
  durationMinutes: number;
  price: number;
  taxCategory: string;
}
