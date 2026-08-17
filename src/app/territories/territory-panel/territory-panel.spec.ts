import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { TaxRegime } from '../../tax/models';
import { Territory } from '../models';
import { TerritoryPanel } from './territory-panel';

const URL = '/api/v1/platform/territories';

const NC: Territory = {
  regime: TaxRegime.TGC,
  territoryCode: 'NC',
  territoryLabel: 'Nouvelle-Calédonie',
  taxName: 'TGC',
  open: true,
};
const PF: Territory = {
  regime: TaxRegime.TVA_PF,
  territoryCode: 'PF',
  territoryLabel: 'Polynésie française',
  taxName: 'TVA',
  open: true,
};

describe('TerritoryPanel', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TerritoryPanel],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: Territory[] = [NC, PF]) {
    const fixture = TestBed.createComponent(TerritoryPanel);
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

  it('reports a failure to load without leaving a blank panel', () => {
    const fixture = TestBed.createComponent(TerritoryPanel);
    http.expectOne(URL).error(new ProgressEvent('error'));

    expect(fixture.componentInstance.error()).toBeTruthy();
  });
});
