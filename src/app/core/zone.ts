/**
 * Mettre une date en forme **dans le fuseau d'un territoire**, jamais dans celui du navigateur.
 *
 * <p><b>Pourquoi ce fichier existe.</b> Le backoffice regarde des salons repartis sur plusieurs
 * territoires depuis un seul poste. Entre Nouméa et Papeete il y a **vingt et une heures** : ce
 * n'est pas un decalage d'horaire, c'est un decalage de **jour**. Une date rendue dans le fuseau du
 * navigateur annonce donc la mauvaise journee pour la moitie des clients — et le journal de caisse
 * d'un salon polynesien le faisait, ligne apres ligne.
 *
 * <p><b>Pourquoi pas la `DatePipe` d'Angular.</b> Elle n'accepte pas un nom IANA : elle resout son
 * parametre via `Date.parse('Jan 01, 1970 00:00:00 ' + timezone)`, qui rend `NaN` sur
 * « Pacific/Tahiti » — et **retombe alors en silence sur le fuseau du navigateur**. Ni erreur, ni
 * avertissement : la date s'affiche, simplement fausse. Le meme piege a coute six ecrans au
 * frontoffice. `Intl.DateTimeFormat`, lui, comprend le nom IANA.
 */

/**
 * Date et heure locales d'un instant, dans le fuseau donne.
 *
 * <p>La **date** est toujours rendue, jamais l'heure seule : c'est precisement le jour qui differe
 * d'un territoire a l'autre, et afficher « 08:15 » sans dire quel jour est plus trompeur que de ne
 * rien afficher.
 *
 * <p>Un fuseau que le navigateur ne connait pas ne casse rien : on retombe sur sa mise en forme
 * locale plutot que de lever. Mieux vaut une date approximative qu'un ecran vide — mais le cas ne
 * doit pas passer inapercu, d'ou le suffixe.
 */
export function formatInZone(instant: string | Date | null | undefined, zoneId: string | null): string {
  if (!instant) {
    return '';
  }
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!zoneId) {
    return new Intl.DateTimeFormat('fr-FR', OPTIONS).format(date);
  }
  try {
    return new Intl.DateTimeFormat('fr-FR', { ...OPTIONS, timeZone: zoneId }).format(date);
  } catch {
    return `${new Intl.DateTimeFormat('fr-FR', OPTIONS).format(date)} (fuseau inconnu)`;
  }
}

/** L'heure qu'il est **maintenant** dans ce fuseau, date comprise. */
export function nowInZone(zoneId: string | null): string {
  return formatInZone(new Date(), zoneId);
}

const OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};
