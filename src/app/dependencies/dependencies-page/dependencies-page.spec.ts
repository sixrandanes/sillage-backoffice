import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DependenciesPage } from './dependencies-page';
import { DependencyHealth, DependencyState } from '../models';

const URL = (days: number) => `/api/v1/platform/dependencies?days=${days}`;

function state(overrides: Partial<DependencyState> = {}): DependencyState {
  return {
    code: 'SMTP',
    libelle: 'Relais email',
    usage: "Bons cadeaux, rappels d'expiration",
    statut: 'OPERATIONNELLE',
    appels: 120,
    echecs: 0,
    dureeMoyenneMs: 240,
    dernierEchec: null,
    dernierSucces: '2026-08-18T09:00:00Z',
    derniereCause: null,
    ...overrides,
  };
}

function health(overrides: Partial<DependencyHealth> = {}): DependencyHealth {
  return {
    jours: 7,
    depuis: '2026-08-11T09:00:00Z',
    dependances: [state()],
    derniersEchecs: [],
    ...overrides,
  };
}

describe('DependenciesPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DependenciesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(body: DependencyHealth = health()) {
    const fixture = TestBed.createComponent(DependenciesPage);
    fixture.detectChanges();
    http.expectOne(URL(7)).flush(body);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  /**
   * **Le silence n'est pas la santé.** Une dépendance qu'aucun appel n'a touchée est l'état d'une
   * intégration pas encore câblée — ou d'une qu'on croit câblée. La peindre en vert répondrait
   * « oui » à une question que personne n'a posée.
   */
  it('never paints an uncalled dependency as healthy', () => {
    const { component } = create(
      health({ dependances: [state({ statut: 'JAMAIS_APPELEE', appels: 0 })] }),
    );

    expect(component.statusClass('JAMAIS_APPELEE')).toBe('dep-unknown');
    expect(component.statusClass('JAMAIS_APPELEE')).not.toBe('dep-ok');
    expect(component.statusLabel('JAMAIS_APPELEE')).toBe('Jamais appelée');
  });

  /**
   * **Une intégration pas encore câblée n'est pas une panne.** Les mêler ferait crier au loup sur
   * chaque dépendance qu'on n'a pas branchée, et l'encadré d'alerte cesserait d'être lu.
   */
  it('keeps never-called dependencies out of what demands action', () => {
    const { component } = create(
      health({
        dependances: [
          state({ code: 'PAYMENT', statut: 'JAMAIS_APPELEE', appels: 0 }),
          state({ code: 'SMTP', statut: 'EN_PANNE', appels: 4, echecs: 4 }),
        ],
      }),
    );

    expect(component.enSouffrance().map((etat) => etat.code)).toEqual(['SMTP']);
    expect(component.jamaisAppelees().map((etat) => etat.code)).toEqual(['PAYMENT']);
  });

  /**
   * **Un compte dit l'ampleur ; seule la cause permet de corriger.** « 14 échecs » envoie lire les
   * journaux d'un conteneur, « authentification refusée » envoie changer un mot de passe.
   */
  it('shows what the service actually answered, not just how often it failed', () => {
    const { fixture } = create(
      health({
        dependances: [
          state({
            statut: 'EN_PANNE',
            appels: 14,
            echecs: 14,
            derniereCause: '535 authentification refusée',
          }),
        ],
      }),
    );

    expect(fixture.nativeElement.textContent).toContain('535 authentification refusée');
  });

  /** Rien ne s'affiche quand il n'y a rien à signaler : un « tout va bien » permanent ne se lit plus. */
  it('says nothing at all when every dependency is fine', () => {
    const { fixture, component } = create();

    expect(component.enSouffrance()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).not.toContain('ne répond pas normalement');
  });

  /**
   * **Un taux d'échec, jamais un taux de réussite.** On ouvre cet écran pour trouver ce qui ne va
   * pas ; « 99,4 % de réussite » demande une soustraction mentale pour répondre à la question posée.
   */
  it('states the failure rate rather than the success rate', () => {
    const { component } = create();

    expect(component.failureRate(state({ appels: 1000, echecs: 6 }))).toBe('0.6 %');
    expect(component.failureRate(state({ appels: 4, echecs: 4 }))).toBe('100 %');
    expect(component.failureRate(state({ appels: 0, echecs: 0 }))).toBe('—');
  });

  it('reloads on a different window', () => {
    const { component } = create();

    component.changeWindow(30);

    http.expectOne(URL(30)).flush(health({ jours: 30 }));
    expect(component.days()).toBe(30);
  });
});
