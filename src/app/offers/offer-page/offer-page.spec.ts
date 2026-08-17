import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { SubscriptionOptions } from '../../subscriptions/models';
import { Offer } from '../models';
import { OfferPage } from './offer-page';

const OPTIONS: SubscriptionOptions = {
  plans: [
    { value: 'SOLO', label: 'Salon unique', maxActiveSalons: 1 },
    { value: 'MULTI', label: 'Multi-salons', maxActiveSalons: 2147483647 },
  ],
  periods: [
    { value: 'MONTHLY', label: 'Mensuel' },
    { value: 'YEARLY', label: 'Annuel' },
  ],
};

function offer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 1,
    code: 'SOLO_ANNUEL',
    label: 'Salon unique — annuel',
    plan: 'SOLO',
    planLabel: 'Salon unique',
    maxActiveSalons: 1,
    billingPeriod: 'YEARLY',
    billingPeriodLabel: 'Annuel',
    price: '49000',
    setupFee: null,
    freeMonths: 2,
    trialDays: 30,
    validFrom: '2026-01-01',
    validTo: null,
    status: 'AVAILABLE',
    statusLabel: 'Proposée',
    monthlyEquivalent: '4084',
    impliedMonthlyPrice: '4900',
    firstYearCost: '49000',
    ...overrides,
  };
}

describe('OfferPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OfferPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: Offer[] = [offer()]) {
    const fixture = TestBed.createComponent(OfferPage);
    http.expectOne('/api/v1/platform/offers/options').flush(OPTIONS);
    http.expectOne('/api/v1/platform/offers').flush(rows);
    return { fixture, component: fixture.componentInstance };
  }

  it('shows the grid as it stands today', () => {
    const { component } = create();

    expect(component.offers()).toHaveLength(1);
    expect(component.isHistorical()).toBe(false);
  });

  /** Même leçon que la grille fiscale : lire une grille passée en croyant voir celle du jour. */
  it('says plainly when the grid being read is not todays', () => {
    const { component } = create();

    component.changeAsOf(new Date(2026, 0, 15));

    http.expectOne('/api/v1/platform/offers?on=2026-01-15').flush([]);
    expect(component.isHistorical()).toBe(true);
  });

  /** Revenir à aujourd'hui n'envoie pas la date du jour, mais aucun paramètre. */
  it('sends no date at all when coming back to today', () => {
    const { component } = create();
    component.changeAsOf(new Date(2026, 0, 15));
    http.expectOne('/api/v1/platform/offers?on=2026-01-15').flush([]);

    component.backToToday();

    http.expectOne('/api/v1/platform/offers').flush([offer()]);
    expect(component.isHistorical()).toBe(false);
  });

  /** Les mois offerts n'ont de sens que sur une annuelle : le serveur refuse, l'écran n'y mène pas. */
  it('only offers the free-months field on an annual offer', () => {
    const { component } = create();

    component.form.controls.billingPeriod.setValue('MONTHLY');
    expect(component.freeMonthsApply()).toBe(false);

    component.form.controls.billingPeriod.setValue('YEARLY');
    expect(component.freeMonthsApply()).toBe(true);
  });

  /** Une valeur restée d'une saisie précédente ne doit pas partir sur une mensuelle. */
  it('never sends free months on a monthly offer even if the field held a value', () => {
    const { component } = create();
    component.form.setValue({
      code: 'solo_mensuel',
      label: 'Salon unique',
      plan: 'SOLO',
      billingPeriod: 'YEARLY',
      price: 49000,
      setupFee: null,
      freeMonths: 2,
      trialDays: 30,
      validFrom: new Date(2026, 0, 1),
      validTo: null,
    });
    component.form.controls.billingPeriod.setValue('MONTHLY');

    component.submit();

    const request = http.expectOne('/api/v1/platform/offers');
    expect(request.request.body.freeMonths).toBe(0);
    // Le code part en majuscules : deux graphies feraient deux offres.
    expect(request.request.body.code).toBe('SOLO_MENSUEL');
    request.flush(offer());
    http.expectOne('/api/v1/platform/offers').flush([]);
  });

  /**
   * `toISOString()` convertit en UTC : sur un poste à Nouméa, une offre datée du 1er janvier
   * partirait au 31 décembre — et changerait d'exercice.
   */
  it('sends the calendar date that was picked, not its UTC equivalent', () => {
    const { component } = create();
    component.form.setValue({
      code: 'X',
      label: 'X',
      plan: 'SOLO',
      billingPeriod: 'MONTHLY',
      price: 4900,
      setupFee: null,
      freeMonths: 0,
      trialDays: 30,
      validFrom: new Date(2026, 0, 1),
      validTo: null,
    });

    component.submit();

    const request = http.expectOne('/api/v1/platform/offers');
    expect(request.request.body.validFrom).toBe('2026-01-01');
    request.flush(offer());
    http.expectOne('/api/v1/platform/offers').flush([]);
  });

  it('loads an offer into the form for correction', () => {
    const { component } = create();

    component.edit(offer({ setupFee: '15000' }));

    expect(component.form.controls.code.value).toBe('SOLO_ANNUEL');
    expect(component.form.controls.setupFee.value).toBe(15000);
    expect(component.editing()).not.toBeNull();
  });

  /** Le refus du serveur s'affiche tel quel : lui seul sait quelle offre porte déjà ce code. */
  it('shows the server refusal verbatim', () => {
    const { component } = create();
    component.form.setValue({
      code: 'SOLO_ANNUEL',
      label: 'Doublon',
      plan: 'SOLO',
      billingPeriod: 'YEARLY',
      price: 49000,
      setupFee: null,
      freeMonths: 2,
      trialDays: 30,
      validFrom: new Date(2026, 0, 1),
      validTo: null,
    });

    component.submit();

    http.expectOne('/api/v1/platform/offers').flush(
      { message: 'Une offre porte deja le code SOLO_ANNUEL (« Salon unique — annuel »).' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(component.formError()).toContain('SOLO_ANNUEL');
  });

  it('reports a failure to load without leaving a blank screen', () => {
    const fixture = TestBed.createComponent(OfferPage);
    http.expectOne('/api/v1/platform/offers/options').flush(OPTIONS);
    http.expectOne('/api/v1/platform/offers').error(new ProgressEvent('error'));

    expect(fixture.componentInstance.loadError()).toBeTruthy();
  });
});
