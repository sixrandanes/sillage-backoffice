import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { SubscriptionAdminView, SubscriptionOptions } from '../models';
import { SubscriptionPage } from './subscription-page';

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

function view(overrides: Partial<SubscriptionAdminView> = {}): SubscriptionAdminView {
  return {
    organizationId: 1,
    organizationName: 'Salon Hibiscus',
    organizationActive: true,
    plan: 'SOLO',
    planLabel: 'Salon unique',
    offerCode: null,
    offerLabel: null,
    billingPeriod: null,
    status: 'TRIAL',
    statusLabel: 'Essai en cours',
    trialEndsAt: '2026-09-17T00:00:00Z',
    paidThrough: null,
    cancelledAt: null,
    accessUntil: '2026-09-17T00:00:00Z',
    activeSalons: 1,
    ...overrides,
  };
}

describe('SubscriptionPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SubscriptionPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: SubscriptionAdminView[] = [view()]) {
    const fixture = TestBed.createComponent(SubscriptionPage);
    const component = fixture.componentInstance;
    // La page charge aussi la grille tarifaire, pour pouvoir rattacher une offre.
    http.expectOne('/api/v1/platform/offers').flush([]);
    http.expectOne('/api/v1/platform/subscriptions/options').flush(OPTIONS);
    http.expectOne('/api/v1/platform/subscriptions/expiring?days=60').flush(rows);
    return { fixture, component };
  }

  /**
   * L'écran s'ouvre sur les échéances, pas sur la liste complète : sa raison d'être est de dire
   * qui va se bloquer.
   */
  it('opens on the expiry watchlist with a two-month horizon', () => {
    const { component } = create();

    expect(component.scope()).toBe('expiring');
    expect(component.rows()).toHaveLength(1);
  });

  it('switches to the full estate on demand', () => {
    const { component } = create();

    component.changeScope('all');

    http.expectOne('/api/v1/platform/subscriptions').flush([view(), view({ organizationId: 2 })]);
    expect(component.rows()).toHaveLength(2);
  });

  it('reloads when the horizon changes', () => {
    const { component } = create();

    component.changeHorizon(180);

    http.expectOne('/api/v1/platform/subscriptions/expiring?days=180').flush([]);
    expect(component.rows()).toEqual([]);
  });

  /** Un client dont la caisse est fermée ne doit pas se noyer parmi ceux qui expirent bientôt. */
  it('counts separately the clients whose till is already closed', () => {
    const { component } = create([
      view({ status: 'TRIAL' }),
      view({ organizationId: 2, status: 'TRIAL_ENDED' }),
      view({ organizationId: 3, status: 'LAPSED' }),
      view({ organizationId: 4, status: 'CANCELLED' }),
    ]);

    expect(component.blockedCount()).toBe(2);
  });

  it('shows how many days are left, negative once the deadline has passed', () => {
    const { component } = create();
    const hier = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

    expect(component.daysLeft(view({ accessUntil: hier }))).toBeLessThan(0);
  });

  /**
   * Une date envoyée en `AAAA-MM-JJ`, jamais un instant : `toISOString()` convertit en UTC et,
   * sur un poste à Nouméa (UTC+11), la date choisie repartirait **la veille**.
   */
  it('sends the calendar date the user picked, not its UTC equivalent', () => {
    const { component } = create();
    component.select(view());

    component.coverForm.setValue({ through: new Date(2027, 2, 31), billingPeriod: 'YEARLY' });
    component.cover();

    const request = http.expectOne('/api/v1/platform/subscriptions/1/cover');
    expect(request.request.body.through).toBe('2027-03-31');
    request.flush(view({ paidThrough: '2027-04-01T00:00:00Z' }));
  });

  it('extends a trial by the requested number of days', () => {
    const { component } = create();
    component.select(view());

    component.trialForm.setValue({ days: 21 });
    component.extendTrial();

    const request = http.expectOne('/api/v1/platform/subscriptions/1/extend-trial');
    expect(request.request.body).toEqual({ days: 21 });
    request.flush(view());
    http.expectOne('/api/v1/platform/subscriptions/expiring?days=60').flush([]);
  });

  /** Le geste que le client a demandé : arrêter sans supprimer les salons. */
  it('stops renewal and says plainly that nothing was deleted', () => {
    const { component } = create();
    component.select(view());

    component.cancel();

    http.expectOne('/api/v1/platform/subscriptions/1/cancel').flush(
      view({ cancelledAt: '2026-08-17T09:00:00Z' }),
    );
    http.expectOne('/api/v1/platform/subscriptions/expiring?days=60').flush([]);
    expect(component.actionDone()).toContain('salons ne sont pas touchés');
  });

  it('offers the counterpart gesture once cancelled', () => {
    const { component } = create();
    component.select(view({ cancelledAt: '2026-08-01T00:00:00Z' }));

    component.resume();

    http.expectOne('/api/v1/platform/subscriptions/1/resume').flush(view());
    http.expectOne('/api/v1/platform/subscriptions/expiring?days=60').flush([]);
    expect(component.selected()?.cancelledAt).toBeNull();
  });

  /**
   * <b>Le refus du serveur s'affiche tel quel.</b> C'est lui qui sait dire combien de salons sont
   * actifs — un message générique perdrait exactement ce qui aide à corriger.
   */
  it('shows the server refusal verbatim rather than a generic message', () => {
    const { component } = create();
    component.select(view({ activeSalons: 3, plan: 'MULTI' }));

    component.planForm.setValue({ plan: 'SOLO' });
    component.changePlan();

    http.expectOne('/api/v1/platform/subscriptions/1/plan').flush(
      { message: 'Cette organisation exploite 3 salons actifs, or l’offre « Salon unique » en couvre 1.' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(component.actionError()).toContain('3 salons actifs');
  });

  /** Un abonnement déjà payant se prolonge par sa couverture, pas par son essai. */
  it('does not offer to extend the trial of a paying subscription', () => {
    const { component } = create();

    expect(component.canExtendTrial(view({ paidThrough: '2027-01-01T00:00:00Z' }))).toBe(false);
    expect(component.canExtendTrial(view())).toBe(true);
  });

  /** Reconduire suppose de savoir de combien : sans périodicité, le serveur refuserait. */
  it('does not offer to renew before a billing period has been recorded', () => {
    const { component } = create();

    expect(component.canRenew(view())).toBe(false);
    expect(component.canRenew(view({ billingPeriod: 'YEARLY' }))).toBe(true);
  });

  /** Sans les offres, seul le changement d'offre est indisponible : le reste doit tenir. */
  it('still works when the options endpoint fails', () => {
    const fixture = TestBed.createComponent(SubscriptionPage);
    http.expectOne('/api/v1/platform/subscriptions/options').error(new ProgressEvent('error'));
    http.expectOne('/api/v1/platform/subscriptions/expiring?days=60').flush([view()]);

    expect(fixture.componentInstance.options()).toBeNull();
    expect(fixture.componentInstance.rows()).toHaveLength(1);
  });

  it('reports a failure to load without leaving a blank screen', () => {
    const fixture = TestBed.createComponent(SubscriptionPage);
    // La page charge aussi la grille tarifaire, pour pouvoir rattacher une offre.
    http.expectOne('/api/v1/platform/offers').flush([]);
    http.expectOne('/api/v1/platform/subscriptions/options').flush(OPTIONS);
    http
      .expectOne('/api/v1/platform/subscriptions/expiring?days=60')
      .error(new ProgressEvent('error'));

    expect(fixture.componentInstance.loadError()).toBeTruthy();
  });

  /**
   * <b>Le geste qui sort les clients d'avant la grille de leur etat sans offre.</b> Sans lui, ils y
   * resteraient pour toujours — le piege du champ reglable nulle part.
   */
  it('attaches the offer a client is actually on', () => {
    const { component } = create([view({ offerCode: null, offerLabel: null })]);
    component.select(view({ offerCode: null, offerLabel: null }));

    component.offerForm.setValue({ offerCode: 'SOLO_ANNUEL' });
    component.changeOffer();

    const request = http.expectOne('/api/v1/platform/subscriptions/1/offer');
    expect(request.request.body).toEqual({ offerCode: 'SOLO_ANNUEL' });
    request.flush(view({ offerCode: 'SOLO_ANNUEL', offerLabel: 'Salon unique — annuel' }));
    http.expectOne('/api/v1/platform/subscriptions/expiring?days=60').flush([]);
    expect(component.actionDone()).toBe('Offre rattachée.');
  });

  /** Sans la grille, seul le rattachement est indisponible : le reste de l'ecran doit tenir. */
  it('still works when the price grid cannot be loaded', () => {
    const fixture = TestBed.createComponent(SubscriptionPage);
    http.expectOne('/api/v1/platform/offers').error(new ProgressEvent('error'));
    http.expectOne('/api/v1/platform/subscriptions/options').flush(OPTIONS);
    http.expectOne('/api/v1/platform/subscriptions/expiring?days=60').flush([view()]);

    expect(fixture.componentInstance.offers()).toEqual([]);
    expect(fixture.componentInstance.rows()).toHaveLength(1);
  });

});
