import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { PlatformOverview } from '../models';
import { OverviewPage } from './overview-page';

const VIDE: PlatformOverview = {
  stock: {
    organisations: 3,
    organisationsActives: 3,
    abonnementsParStatut: { TRIAL: 1, ACTIVE: 2, TRIAL_ENDED: 0, LAPSED: 0, CANCELLED: 0 },
    salons: 4,
    salonsActifs: 4,
    salonsActifsParTerritoire: { TGC: 4, TVA_PF: 0 },
    revenu: { mensuel: 9800, annuel: 117600, enEssai: 4900, dontResilie: 0, remisesAccordees: 0 },
  },
  mouvement: {
    jours: 30,
    inscriptions: { periode: 2, precedente: 0 },
    resiliations: { periode: 0, precedente: 0 },
    salonsOuverts: { periode: 3, precedente: 2 },
    reglementsEnregistres: { periode: 1, precedente: 4 },
  },
  rapports: {
    bloques: { total: 0, exemples: [] },
    aEcheance: { total: 2, exemples: ['Salon Hibiscus', 'Salon Nacre'] },
    essaisNonConvertis: { total: 0, exemples: [] },
    sansAccesProprietaire: { total: 0, exemples: [] },
    sansSalon: { total: 1, exemples: ['Salon Corail'] },
    sansVente: { total: 0, exemples: [] },
    sansOffre: { total: 0, exemples: [] },
  },
};

describe('OverviewPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverviewPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(overview: PlatformOverview = VIDE) {
    const fixture = TestBed.createComponent(OverviewPage);
    http.expectOne('/api/v1/platform/overview?days=30').flush(overview);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  /**
   * <b>Une progression depuis zero n'est pas « +100 % », c'est un demarrage.</b> Afficher un
   * pourcentage la ou il n'y a pas de comparaison possible ferait lire une performance inventee —
   * meme regle que la vue de groupe cote frontoffice, ou ce qui ne se calcule pas reste vide.
   */
  it('refusesToTurnAStartFromZeroIntoAPercentage', () => {
    const { component } = create();

    expect(component.variation({ periode: 2, precedente: 0 })).toBeNull();
    expect(component.variation({ periode: 3, precedente: 2 })).toBe(50);
    expect(component.variation({ periode: 1, precedente: 4 })).toBe(-75);
  });

  /**
   * <b>Rien ne s'affiche quand il n'y a rien a signaler.</b> Un encadre permanent « tout va bien »
   * apprend surtout a ne plus le lire — regle deja tenue par les points d'attention de l'accueil du
   * frontoffice.
   */
  it('showsOnlyTheReportsThatActuallyCarrySomeone', () => {
    const { component } = create();

    const titres = component.rapportsAVoir().map((r) => r.titre);
    expect(titres).toHaveLength(2);
    expect(titres).toContain('À échéance sous 60 jours');
    expect(titres).toContain('Inscrits sans salon');
  });

  /** Changer de periode ne recharge que le mouvement — mais l'appel porte bien la nouvelle duree. */
  it('asksForTheChosenPeriod', () => {
    const { component } = create();

    component.changerPeriode(90);

    http.expectOne('/api/v1/platform/overview?days=90').flush(VIDE);
  });

  /** Un echec efface le resultat precedent : le garder le ferait passer pour la periode demandee. */
  it('clearsTheFiguresRatherThanShowingStaleOnesOnFailure', () => {
    const { component } = create();

    component.changerPeriode(365);
    http.expectOne('/api/v1/platform/overview?days=365').error(new ProgressEvent('error'));

    expect(component.overview()).toBeNull();
    expect(component.error()).toBeTruthy();
  });
});
