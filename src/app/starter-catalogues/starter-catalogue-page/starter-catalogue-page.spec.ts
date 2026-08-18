import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { StarterActivity } from '../models';
import { StarterCataloguePage } from './starter-catalogue-page';

const URL = '/api/v1/platform/starter-catalogues';
const CATEGORIES_URL = '/api/v1/platform/tax/categories';

const COIFFURE: StarterActivity = {
  id: 1,
  label: 'Coiffure',
  services: [
    { id: 11, name: 'Coupe femme', durationMinutes: 45, price: 3500, taxCategory: 'NORMAL' },
  ],
};

function fullActivity(): StarterActivity {
  return {
    id: 2,
    label: 'Onglerie',
    services: Array.from({ length: 8 }, (_, i) => ({
      id: 20 + i,
      name: `Prestation ${i}`,
      durationMinutes: 30,
      price: 1000,
      taxCategory: 'NORMAL',
    })),
  };
}

describe('StarterCataloguePage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StarterCataloguePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: StarterActivity[] = [COIFFURE]) {
    const fixture = TestBed.createComponent(StarterCataloguePage);
    http.expectOne(URL).flush(rows);
    http.expectOne(CATEGORIES_URL).flush([
      { code: 'NORMAL', label: 'Taux normal', position: 4 },
      { code: 'REDUCED', label: 'Taux réduit', position: 2 },
    ]);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('lists the trades and counts the suggestions', () => {
    const { component } = create();

    expect(component.activities()).toHaveLength(1);
    expect(component.totalServices()).toBe(1);
  });

  it('adds a suggestion to a trade', () => {
    const { component } = create();
    component.startAdd(COIFFURE);
    component.serviceForm.patchValue({
      name: 'Brushing',
      durationMinutes: 30,
      price: 2500,
      taxCategory: 'NORMAL',
    });

    component.submitService(COIFFURE);

    const request = http.expectOne((r) => r.method === 'POST' && r.url === `${URL}/1/services`);
    expect(request.request.body.name).toBe('Brushing');
    request.flush(COIFFURE);
    http.expectOne(URL).flush([COIFFURE]);
  });

  /** Le plafond du serveur, dit avant le refus : pas de bouton dont on connaît le refus d'avance. */
  it('says a trade is full instead of offering a ninth add', () => {
    const { fixture, component } = create([fullActivity()]);

    expect(component.isFull(fullActivity())).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('le maximum');
    expect(fixture.nativeElement.textContent).not.toContain('Suggérer une prestation');
  });

  /** Supprimer un métier retire ce que verront tous les nouveaux inscrits : deux temps. */
  it('does not delete a trade on the first click', () => {
    const { component } = create();

    component.askDeletion('activity-1');

    http.expectNone((r) => r.method === 'DELETE');
    component.confirmDeleteActivity(COIFFURE);
    http.expectOne((r) => r.method === 'DELETE' && r.url === `${URL}/1`).flush(null);
    http.expectOne(URL).flush([]);
  });

  /** Le refus du serveur s'affiche tel quel : lui seul sait qu'un nom existe déjà. */
  it('shows the server refusal verbatim', () => {
    const { component } = create();
    component.startAdd(COIFFURE);
    component.serviceForm.patchValue({
      name: 'Coupe femme',
      durationMinutes: 45,
      price: 3500,
      taxCategory: 'NORMAL',
    });

    component.submitService(COIFFURE);
    http.expectOne((r) => r.method === 'POST').flush(
      { message: '« Coupe femme » est déjà suggérée par ce métier.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(component.error()).toContain('déjà suggérée');
  });

  /** Sans les tranches, seul l'ajout est indisponible : l'écran continue de fonctionner. */
  it('keeps working when the tax categories cannot be loaded', () => {
    const fixture = TestBed.createComponent(StarterCataloguePage);
    http.expectOne(URL).flush([COIFFURE]);
    http.expectOne(CATEGORIES_URL).flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.activities()).toHaveLength(1);
    expect(fixture.componentInstance.taxCategories()).toEqual([]);
  });

  it('renames a trade', () => {
    const { component } = create();
    component.startRename(COIFFURE);
    component.renameForm.patchValue({ label: 'Coiffure & barbier' });

    component.rename(COIFFURE);

    const request = http.expectOne((r) => r.method === 'PUT' && r.url === `${URL}/1`);
    expect(request.request.body.label).toBe('Coiffure & barbier');
    request.flush(COIFFURE);
    http.expectOne(URL).flush([COIFFURE]);
  });
});
