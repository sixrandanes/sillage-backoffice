import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SalonAuditEntry } from '../audit.models';
import { SalonAudit } from './salon-audit';

const ACTIONS = '/api/v1/platform/salons/4/audit/actions';
const ENTRIES = '/api/v1/platform/salons/4/audit/entries';

function entry(overrides: Partial<SalonAuditEntry> = {}): SalonAuditEntry {
  return {
    id: 1,
    sequenceNumber: 128,
    action: 'SALE_REFUNDED',
    actionLabel: 'Vente remboursée',
    entityType: 'SALE',
    entityId: 12,
    actor: 'Marie Wamytan',
    details: 'Avoir sur la vente 2026-000128 — shampooing rapporté',
    occurredAt: '2026-08-12T03:20:00Z',
    hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    ...overrides,
  };
}

describe('SalonAudit', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SalonAudit],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: SalonAuditEntry[] = [entry()]) {
    const fixture = TestBed.createComponent(SalonAudit);
    fixture.componentRef.setInput('salonId', 4);
    fixture.detectChanges();
    http.expectOne(ACTIONS).flush([{ value: 'SALE_REFUNDED', label: 'Vente remboursée' }]);
    http.expectOne(`${ENTRIES}?page=0&size=25`).flush({
      items: rows,
      totalItems: rows.length,
      page: 0,
      size: 25,
    });
    return { fixture, component: fixture.componentInstance };
  }

  it('reads the journal of that salon', () => {
    const { component } = create();

    expect(component.entries()).toHaveLength(1);
    expect(component.totalItems()).toBe(1);
  });

  /** Un filtre absent ne filtre pas : on n'envoie pas de paramètre vide. */
  it('sends no filter parameters when nothing is filtered', () => {
    create();

    // La requête initiale ne porte que la pagination — vérifié par le expectOne ci-dessus, qui
    // échouerait si un `action=` ou un `search=` vide s'y ajoutait.
    http.verify();
  });

  it('filters on the nature of the gesture', () => {
    const { component, fixture } = create();

    component.changeAction('SALE_REFUNDED');
    // Les `effect()` ne s'executent pas sans cycle de detection : sans cette ligne, aucune requete
    // ne part et le test echoue en annoncant une URL absente plutot qu'un effet non declenche.
    fixture.detectChanges();

    http.expectOne(`${ENTRIES}?page=0&size=25&action=SALE_REFUNDED`).flush({
      items: [],
      totalItems: 0,
      page: 0,
      size: 25,
    });
    expect(component.entries()).toEqual([]);
  });

  /**
   * <b>L'erreur d'un jour n'est pas cosmétique ici</b> : le serveur résout ces bornes dans le fuseau
   * du salon, donc `toISOString()` — qui convertit en UTC — retournerait les écritures d'un autre
   * jour depuis un poste à Nouméa.
   */
  it('sends the calendar date that was picked, not its UTC equivalent', () => {
    const { component, fixture } = create();

    component.changeFrom(new Date(2026, 7, 12));
    fixture.detectChanges();

    http.expectOne(`${ENTRIES}?page=0&size=25&from=2026-08-12`).flush({
      items: [],
      totalItems: 0,
      page: 0,
      size: 25,
    });
  });

  it('debounces the free-text search', () => {
    vi.useFakeTimers();
    const { component, fixture } = create();

    component.searchControl.setValue('bon cadeau');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    http.expectOne(`${ENTRIES}?page=0&size=25&search=bon%20cadeau`).flush({
      items: [],
      totalItems: 0,
      page: 0,
      size: 25,
    });
    vi.useRealTimers();
  });

  /** Changer de filtre ramène à la première page : sinon on reste sur une page qui n'existe plus. */
  it('goes back to the first page whenever a filter changes', () => {
    const { component, fixture } = create();
    component.changePage({ pageIndex: 3, pageSize: 25, length: 100 });
    fixture.detectChanges();
    http.expectOne(`${ENTRIES}?page=3&size=25`).flush({ items: [], totalItems: 100, page: 3, size: 25 });

    component.changeAction('SALE_REFUNDED');
    fixture.detectChanges();

    http.expectOne(`${ENTRIES}?page=0&size=25&action=SALE_REFUNDED`).flush({
      items: [],
      totalItems: 0,
      page: 0,
      size: 25,
    });
    expect(component.page()).toBe(0);
  });

  /** L'empreinte fait 64 caractères : entière, elle chasserait toute la ligne. */
  it('abbreviates the hash for the screen and keeps it whole in the payload', () => {
    const { component } = create();

    expect(component.shortHash(entry().hash)).toBe('a1b2c3d4e5f6');
    expect(component.entries()[0].hash).toHaveLength(64);
  });

  /** Sans les libellés, seul le filtre par nature disparaît : le journal reste lisible. */
  it('still shows the journal when the action labels cannot be loaded', () => {
    const fixture = TestBed.createComponent(SalonAudit);
    fixture.componentRef.setInput('salonId', 4);
    fixture.detectChanges();
    http.expectOne(ACTIONS).error(new ProgressEvent('error'));
    http.expectOne(`${ENTRIES}?page=0&size=25`).flush({
      items: [entry()],
      totalItems: 1,
      page: 0,
      size: 25,
    });

    expect(fixture.componentInstance.actions()).toEqual([]);
    expect(fixture.componentInstance.entries()).toHaveLength(1);
  });

  it('reports a failure to load without leaving a blank panel', () => {
    const fixture = TestBed.createComponent(SalonAudit);
    fixture.componentRef.setInput('salonId', 4);
    fixture.detectChanges();
    http.expectOne(ACTIONS).flush([]);
    http.expectOne(`${ENTRIES}?page=0&size=25`).error(new ProgressEvent('error'));

    expect(fixture.componentInstance.loadError()).toBeTruthy();
  });
});
