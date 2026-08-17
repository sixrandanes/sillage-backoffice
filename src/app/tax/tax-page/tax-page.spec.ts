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
  rates: [{ id: 1, category: 'NORMAL', label: 'Taux normal', rate: 0.11, validFrom: '2018-10-01', validTo: null }],
};

const TVA_PF: TaxRegimeInfo = {
  regime: TaxRegime.TVA_PF,
  territoryCode: 'PF',
  territoryLabel: 'Polynésie française',
  taxName: 'TVA',
  taxLabel: 'Taxe sur la valeur ajoutée',
  rates: [{ id: 1, category: 'NORMAL', label: 'Taux normal', rate: 0.16, validFrom: '2018-01-01', validTo: null }],
};

describe('TaxPage', () => {
  let httpMock: HttpTestingController;

  /**
   * Le vocabulaire des tranches se charge en meme temps que les regimes. Il est commun aux deux,
   * donc pose une seule fois — mais rejoue a chaque rechargement, une tranche pouvant venir
   * d'etre creee.
   */
  /**
   * Le panneau des territoires vit sur cette page et charge sa propre liste au demarrage.
   *
   * Sans ce service, `httpMock.verify()` echouerait sur une requete en attente — et le message
   * pointerait vers les territoires plutot que vers ce que le test verifie.
   */
  function flushTerritories(): void {
    httpMock.expectOne('/api/v1/platform/territories').flush([]);
  }

  function flushCategories(): void {
    httpMock.expectOne('/api/v1/platform/tax/categories').flush([
      { code: 'NORMAL', label: 'Taux normal', position: 40 },
    ]);
  }

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

  /** Ouvre l'ecran avec sa grille chargee : le point de depart de la plupart des scenarios. */
  function open() {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();
    flushTerritories();
    flushCategories();
    httpMock.expectOne('/api/v1/platform/tax/regimes').flush([TGC, TVA_PF]);
    return fixture;
  }

  it('loadsTheGridOfEachRegimeOnInit', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();
    flushTerritories();

    flushCategories();
    httpMock.expectOne('/api/v1/platform/tax/regimes').flush([TGC, TVA_PF]);

    expect(fixture.componentInstance.panels()).toHaveLength(2);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('showsAnErrorWhenTheGridCannotBeLoaded', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();
    flushTerritories();

    flushCategories();
    httpMock.expectOne('/api/v1/platform/tax/regimes').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('doesNotSubmitAnIncompleteSchedulingForm', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();
    flushTerritories();
    flushCategories();
    httpMock.expectOne('/api/v1/platform/tax/regimes').flush([TGC, TVA_PF]);

    fixture.componentInstance.scheduleFor(fixture.componentInstance.panels()[0]);

    httpMock.expectNone('/api/v1/platform/tax/regimes/TGC/rates');
    expect(fixture.componentInstance.panels()[0].form.touched).toBe(true);
  });

  it('schedulesANewRateAndReloadsTheGrid', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();
    flushTerritories();
    flushCategories();
    httpMock.expectOne('/api/v1/platform/tax/regimes').flush([TGC, TVA_PF]);

    const panel = fixture.componentInstance.panels()[0];
    panel.form.setValue({
      category: 'NORMAL', ratePercent: 12, label: 'Taux normal', validFrom: new Date(2027, 0, 1),
    });

    fixture.componentInstance.scheduleFor(panel);

    const req = httpMock.expectOne('/api/v1/platform/tax/regimes/TGC/rates');
    expect(req.request.body).toEqual({
      category: 'NORMAL', rate: 0.12, label: 'Taux normal', validFrom: '2027-01-01',
    });
    req.flush({ id: 1, category: 'NORMAL', label: 'Taux normal', rate: 0.12, validFrom: '2027-01-01', validTo: null });

    // scheduleFor() declenche un rechargement complet de la grille.
    flushCategories();
    httpMock.expectOne('/api/v1/platform/tax/regimes').flush([TGC, TVA_PF]);
  });

  it('togglesTheHistoryOfARegime', () => {
    const fixture = TestBed.createComponent(TaxPage);
    fixture.detectChanges();
    flushTerritories();
    flushCategories();
    httpMock.expectOne('/api/v1/platform/tax/regimes').flush([TGC, TVA_PF]);

    const panel = fixture.componentInstance.panels()[0];
    fixture.componentInstance.toggleHistory(panel);

    httpMock.expectOne('/api/v1/platform/tax/regimes/TGC/history').flush([TGC.rates[0]]);
    expect(fixture.componentInstance.panels()[0].history).toHaveLength(1);

    fixture.componentInstance.toggleHistory(fixture.componentInstance.panels()[0]);
    expect(fixture.componentInstance.panels()[0].history).toBeNull();
  });

  /**
   * <b>La regle centrale du module, vue de l'ecran.</b> Un taux qui a pris effet a servi a taxer
   * des ventes : il ne se corrige ni ne s'annule. Seul un taux encore a venir reste manœuvrable —
   * et sans ce chemin, une faute de frappe sur un taux prevu dans six mois etait definitive.
   */
  it('onlyOffersToCancelARateThatHasNotTakenEffect', () => {
    const fixture = open();

    const enVigueur = { id: 1, category: 'NORMAL', label: 'Taux normal', rate: 0.11, validFrom: '2018-10-01', validTo: null };
    const aVenir = { id: 2, category: 'NORMAL', label: 'Taux normal', rate: 0.12, validFrom: '2099-01-01', validTo: null };

    expect(fixture.componentInstance.isScheduled(enVigueur)).toBe(false);
    expect(fixture.componentInstance.isScheduled(aVenir)).toBe(true);
  });

  /** Annuler rouvre le taux precedent cote serveur : l'ecran se contente de recharger. */
  it('cancelsAScheduledRateAndReloads', () => {
    const fixture = open();
    const panel = fixture.componentInstance.panels()[0];

    fixture.componentInstance.cancelScheduled(panel, {
      id: 7, category: 'NORMAL', label: 'Taux normal', rate: 0.12, validFrom: '2099-01-01', validTo: null,
    });
    httpMock.expectOne('/api/v1/platform/tax/rates/7').flush(null);

    flushCategories();
    httpMock.expectOne('/api/v1/platform/tax/regimes').flush([TGC, TVA_PF]);
  });

  /**
   * <b>Le refus du serveur s'affiche tel quel.</b> C'est lui qui sait dire ce qui bloque —
   * combien de produits portent encore la tranche, par exemple. Le remplacer par un libelle
   * generique ferait perdre exactement ce qui aide a corriger.
   */
  it('showsTheServerReasonWhenClosingIsRefused', () => {
    const fixture = open();
    const panel = fixture.componentInstance.panels()[0];

    fixture.componentInstance.closeFor(panel, TGC.rates[0], new Date(2099, 0, 1));
    httpMock.expectOne(`/api/v1/platform/tax/regimes/TGC/rates/${TGC.rates[0].category}/close`)
      .flush({ message: '7 produit(s) utilisent cette tranche' },
             { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.panels()[0].scheduleError).toContain('7 produit');
  });

  /** Le serveur refuse un code mal forme : son message nomme la regle, l'ecran le relaie. */
  it('showsTheServerReasonWhenACategoryIsRefused', () => {
    const fixture = open();

    fixture.componentInstance.categoryForm.setValue({
      code: 'taux réduit', label: 'Taux réduit', position: 25,
    });
    fixture.componentInstance.createCategory();
    httpMock.expectOne('/api/v1/platform/tax/categories')
      .flush({ message: 'Le code doit etre en majuscules' },
             { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.categoryError()).toContain('majuscules');
  });

  /**
   * <b>La lecture « par blocs », sans blocs stockes.</b> L'historique repond ligne par ligne, mais
   * ne montre jamais la grille **entiere** telle qu'elle se presentera apres trois changements
   * programmes. Le parametre de date la donne, en interrogeant les memes intervalles.
   */
  it('readsTheGridAtTheChosenDate', () => {
    const fixture = open();

    fixture.componentInstance.readAsOf(new Date(2027, 0, 1));

    flushCategories();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/platform/tax/regimes' && r.params.get('on') === '2027-01-01');
    req.flush([TGC, TVA_PF]);

    expect(fixture.componentInstance.isHistorical()).toBe(true);
  });

  /**
   * Sans ce rappel, on lirait une grille passee ou future en croyant voir celle du jour — et on
   * programmerait un taux a partir d'une lecture fausse.
   */
  it('saysPlainlyWhenTheGridIsNotTodays', () => {
    const fixture = open();
    expect(fixture.componentInstance.isHistorical()).toBe(false);

    fixture.componentInstance.readAsOf(new Date(2020, 0, 1));
    flushCategories();
    httpMock.expectOne((r) => r.url === '/api/v1/platform/tax/regimes').flush([TGC, TVA_PF]);
    expect(fixture.componentInstance.isHistorical()).toBe(true);

    // Et l'on revient a aujourd'hui sans parametre, pas avec la date du jour : c'est le serveur
    // qui sait dans quel territoire on est, et l'ecart Noumea/Papeete est d'un jour entier.
    fixture.componentInstance.readAsOf(null);
    flushCategories();
    const retour = httpMock.expectOne((r) => r.url === '/api/v1/platform/tax/regimes');
    expect(retour.request.params.has('on')).toBe(false);
    retour.flush([TGC, TVA_PF]);

    expect(fixture.componentInstance.isHistorical()).toBe(false);
  });
});
