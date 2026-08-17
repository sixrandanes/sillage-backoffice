import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { Territory } from '../../tax/models';
import { TerritoryView } from '../models';
import { TerritoryPage } from './territory-page';

const URL = '/api/v1/platform/territories';

const NC: TerritoryView = {
  territory: Territory.TGC,
  territoryCode: 'NC',
  territoryLabel: 'Nouvelle-Calédonie',
  taxName: 'TGC',
  zoneId: 'Pacific/Noumea',
  activeSalons: 3,
  open: true,
};
const PF: TerritoryView = {
  territory: Territory.TVA_PF,
  territoryCode: 'PF',
  territoryLabel: 'Polynésie française',
  taxName: 'TVA',
  zoneId: 'Pacific/Tahiti',
  activeSalons: 0,
  open: true,
};

describe('TerritoryPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TerritoryPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: TerritoryView[] = [NC, PF]) {
    const fixture = TestBed.createComponent(TerritoryPage);
    http.expectOne(URL).flush(rows);
    return { fixture, component: fixture.componentInstance };
  }

  it('lists the territories the software knows', () => {
    const { component } = create();

    expect(component.territories()).toHaveLength(2);
  });

  it('closes a territory', () => {
    const { component } = create();

    component.toggle(PF, false);

    const request = http.expectOne(`${URL}/TVA_PF`);
    expect(request.request.body).toEqual({ open: false });
    request.flush({ ...PF, open: false });
    http.expectOne(URL).flush([NC, { ...PF, open: false }]);
    expect(component.territories()[1].open).toBe(false);
  });

  /**
   * <b>Un interrupteur laissé sur la position cliquée ferait croire à un changement qui n'a pas eu
   * lieu.</b> On recharge donc l'état réel, même — et surtout — en cas de refus.
   */
  it('puts the switch back to what the server actually holds when the gesture fails', () => {
    const { component } = create();

    component.toggle(PF, false);

    http.expectOne(`${URL}/TVA_PF`).error(new ProgressEvent('error'));
    http.expectOne(URL).flush([NC, PF]);
    expect(component.error()).toBeTruthy();
    expect(component.territories()[1].open).toBe(true);
  });

  /**
   * <b>Ce qui justifie que le territoire ait quitte l'ecran des taxes — et la date, pas l'heure.</b>
   *
   * <p>Vingt et une heures separent les deux territoires : ce n'est pas un decalage d'horaire, c'est
   * un decalage de <b>jour</b>. Un ecran qui n'afficherait que l'heure serait plus trompeur que
   * muet, puisque c'est le jour qui fait qu'une journee comptable ne se decoupe pas au meme moment.
   */
  it('showsTheLocalDateAndNotOnlyTheLocalTime', () => {
    const { component } = create();

    expect(component.localDate(NC)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    // Les deux territoires ne peuvent pas afficher le meme instant local.
    expect(component.localDate(PF)).not.toBe(component.localDate(NC));
  });

  /**
   * Un fuseau que le navigateur ne connait pas ne doit pas casser l'ecran — mais il ne doit pas non
   * plus passer inapercu.
   */
  it('saysSoRatherThanBreakingOnAZoneItCannotResolve', () => {
    const { component } = create();

    expect(component.localDate({ ...NC, zoneId: 'Pacific/Nulle-Part' })).toContain('fuseau inconnu');
  });

  it('reports a failure to load without leaving a blank panel', () => {
    const fixture = TestBed.createComponent(TerritoryPage);
    http.expectOne(URL).error(new ProgressEvent('error'));

    expect(fixture.componentInstance.error()).toBeTruthy();
  });
});
