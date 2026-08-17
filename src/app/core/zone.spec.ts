import { describe, expect, it } from 'vitest';

import { formatInZone } from './zone';

/**
 * <b>Ce que ces tests gardent : le jour.</b> Vingt et une heures separent Nouméa de Papeete, donc un
 * meme instant n'y tombe pas a la meme date. Une mise en forme qui ignorerait le fuseau annoncerait
 * la mauvaise journee pour la moitie des clients, sans qu'aucun appel n'echoue.
 */
describe('formatInZone', () => {
  // 17 aout 2026, 20:00 UTC — soit le 18 a Nouméa (UTC+11) et encore le 17 a Papeete (UTC-10).
  const INSTANT = '2026-08-17T20:00:00Z';

  it('rendersTheDayOfTheTerritoryAndNotTheOneOfTheBrowser', () => {
    expect(formatInZone(INSTANT, 'Pacific/Noumea')).toContain('18/08/2026');
    expect(formatInZone(INSTANT, 'Pacific/Tahiti')).toContain('17/08/2026');
  });

  /** La date est toujours rendue : « 07:00 » sans le jour est plus trompeur que rien. */
  it('alwaysCarriesTheDateAndNotOnlyTheTime', () => {
    expect(formatInZone(INSTANT, 'Pacific/Noumea')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  /** Un fuseau inconnu ne casse pas l'ecran, mais ne passe pas inapercu non plus. */
  it('doesNotBreakOnAZoneTheBrowserCannotResolve', () => {
    expect(formatInZone(INSTANT, 'Pacific/Nulle-Part')).toContain('fuseau inconnu');
  });

  it('rendersNothingForAMissingInstant', () => {
    expect(formatInZone(null, 'Pacific/Noumea')).toBe('');
  });
});
