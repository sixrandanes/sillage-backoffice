import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { TaxCategory, TaxRegime, TaxRegimeInfo } from '../models';
import { TaxPage } from './tax-page';

const TGC: TaxRegimeInfo = {
  regime: TaxRegime.TGC,
  territoryCode: 'NC',
  territoryLabel: 'Nouvelle-Calédonie',
  taxName: 'TGC',
  taxLabel: 'Taxe générale sur la consommation',
  rates: [{ category: TaxCategory.NORMAL, label: 'Taux normal', rate: 0.11, validFrom: '2018-10-01', validTo: null }],
};

const TVA_PF: TaxRegimeInfo = {
  regime: TaxRegime.TVA_PF,
  territoryCode: 'PF',
  territoryLabel: 'Polynésie française',
  taxName: 'TVA',
  taxLabel: 'Taxe sur la valeur ajoutée',
  rates: [{ category: TaxCategory.NORMAL, label: 'Taux normal', rate: 0.16, validFrom: '2018-01-01', validTo: null }],
};

describe('TaxPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideNativeDateAdapter(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loadsTheGridOfEachRegimeOnInit', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();

    httpMock.expectOne('/api/platform/tax/regimes').flush([TGC, TVA_PF]);

    expect(fixture.componentInstance.panels()).toHaveLength(2);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('showsAnErrorWhenTheGridCannotBeLoaded', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();

    httpMock.expectOne('/api/platform/tax/regimes').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('doesNotSubmitAnIncompleteSchedulingForm', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/platform/tax/regimes').flush([TGC, TVA_PF]);

    fixture.componentInstance.scheduleFor(fixture.componentInstance.panels()[0]);

    httpMock.expectNone('/api/platform/tax/regimes/TGC/rates');
    expect(fixture.componentInstance.panels()[0].form.touched).toBe(true);
  });

  it('schedulesANewRateAndReloadsTheGrid', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/platform/tax/regimes').flush([TGC, TVA_PF]);

    const panel = fixture.componentInstance.panels()[0];
    panel.form.setValue({
      category: TaxCategory.NORMAL, ratePercent: 12, label: 'Taux normal', validFrom: new Date(2027, 0, 1),
    });

    fixture.componentInstance.scheduleFor(panel);

    const req = httpMock.expectOne('/api/platform/tax/regimes/TGC/rates');
    expect(req.request.body).toEqual({
      category: TaxCategory.NORMAL, rate: 0.12, label: 'Taux normal', validFrom: '2027-01-01',
    });
    req.flush({ category: TaxCategory.NORMAL, label: 'Taux normal', rate: 0.12, validFrom: '2027-01-01', validTo: null });

    // scheduleFor() declenche un rechargement complet de la grille.
    httpMock.expectOne('/api/platform/tax/regimes').flush([TGC, TVA_PF]);
  });

  it('togglesTheHistoryOfARegime', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/platform/tax/regimes').flush([TGC, TVA_PF]);

    const panel = fixture.componentInstance.panels()[0];
    fixture.componentInstance.toggleHistory(panel);

    httpMock.expectOne('/api/platform/tax/regimes/TGC/history').flush([TGC.rates[0]]);
    expect(fixture.componentInstance.panels()[0].history).toHaveLength(1);

    fixture.componentInstance.toggleHistory(fixture.componentInstance.panels()[0]);
    expect(fixture.componentInstance.panels()[0].history).toBeNull();
  });
});
