/**
 * Enveloppe de pagination renvoyee par l'API (voir `nc.kaimana.shared.PageResponse`).
 *
 * `page` est en base zero, comme cote backend et comme `MatPaginator` — aucune conversion
 * n'est necessaire entre les deux, et il ne faut pas en introduire.
 */
export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

/** Options de recherche paginee communes aux ecrans de liste. */
export interface PageQuery {
  search?: string;
  page?: number;
  size?: number;
}

/** Le backend plafonne la taille de page a 100 (meme convention que le frontend tenant). */
export const MAX_PAGE_SIZE = 100;
