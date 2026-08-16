/**
 * Les cles du stockage local, en un seul endroit — meme organisation que cote frontend.
 *
 * <p>Les regrouper n'est pas cosmetique : une deconnexion qui oublie une cle laisse derriere elle
 * un fragment de session, et c'est precisement ce qu'on ne veut pas sur un poste partage. Une
 * constante isolee dans le service qui l'utilise finit toujours par etre oubliee par le suivant.
 *
 * <p>`LEGACY_KEYS` porte les cles d'avant l'externalisation de l'identite. Les jetons qu'elles
 * contenaient etaient signes par Sillage et sont desormais refuses : les balayer evite qu'un
 * navigateur deja ouvert reparte avec l'un d'eux, rejete a chaque requete sans que rien ne
 * l'explique.
 */
export const TOKEN_KEY = 'sillage-backoffice.token';

const LEGACY_KEYS = ['kaimana-backoffice.token', 'kaimana-backoffice.admin'];

export function clearUserScopedStorage(): void {
  for (const key of [TOKEN_KEY, ...LEGACY_KEYS]) {
    localStorage.removeItem(key);
  }
}
