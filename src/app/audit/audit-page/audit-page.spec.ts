import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuditEntry, FamilyOption } from '../models';
import { AuditPage } from './audit-page';

const FAMILIES: FamilyOption[] = [
  { value: 'PLATFORM_ACCESS', label: 'Accès au backoffice' },
  { value: 'CLIENT_ACCESS', label: 'Accès client' },
  { value: 'TAX', label: 'Fiscalité' },
];

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 1,
    occurredAt: '2026-08-17T09:00:00Z',
    actorLabel: 'Support plateforme — sylvain@sillage.nc',
    action: 'TAX_RATE_OPENED',
    actionLabel: 'Taux ouvert',
    family: 'TAX',
    familyLabel: 'Fiscalité',
    organizationId: null,
    subjectLabel: 'TGC — NORMAL',
    details: '11 %',
    ...overrides,
  };
}

describe('AuditPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuditPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: AuditEntry[] = [entry()]) {
    const fixture = TestBed.createComponent(AuditPage);
    http.expectOne('/api/v1/platform/audit/families').flush(FAMILIES);
    http.expectOne('/api/v1/platform/audit?size=100').flush(rows);
    return { fixture, component: fixture.componentInstance };
  }

  it('opens on the hundred most recent gestures', () => {
    const { component } = create();

    expect(component.entries()).toHaveLength(1);
    expect(component.size()).toBe(100);
  });

  /**
   * <b>La seule distinction qu'on vient chercher devant un incident</b> : ce qui ouvre ou ferme
   * des portes sur des données, et le reste. Un journal tout gris obligerait à lire chaque ligne.
   */
  it('sets apart what touches access from ordinary administration', () => {
    const { component } = create();

    expect(component.severity(entry({ family: 'PLATFORM_ACCESS' }))).toBe('access');
    expect(component.severity(entry({ family: 'CLIENT_ACCESS' }))).toBe('access');
    expect(component.severity(entry({ family: 'TAX' }))).toBe('ordinary');
    expect(component.severity(entry({ family: 'BILLING' }))).toBe('ordinary');
  });

  it('filters on what is at stake', () => {
    const { component } = create();

    component.changeFamily('CLIENT_ACCESS');

    http.expectOne('/api/v1/platform/audit?size=100&family=CLIENT_ACCESS').flush([]);
    expect(component.entries()).toEqual([]);
  });

  /** Revenir à « Tout » n'envoie pas le mot « tout », mais aucun filtre. */
  it('sends no filter at all when the filter is cleared', () => {
    const { component } = create();
    component.changeFamily('TAX');
    http.expectOne('/api/v1/platform/audit?size=100&family=TAX').flush([]);

    component.changeFamily(null);

    http.expectOne('/api/v1/platform/audit?size=100').flush([entry()]);
  });

  it('lets the window be widened', () => {
    const { component } = create();

    component.changeSize(500);

    http.expectOne('/api/v1/platform/audit?size=500').flush([]);
  });

  /** Sans les familles, seul le filtre disparaît : le journal reste lisible. */
  it('still shows the journal when the families cannot be loaded', () => {
    const fixture = TestBed.createComponent(AuditPage);
    http.expectOne('/api/v1/platform/audit/families').error(new ProgressEvent('error'));
    http.expectOne('/api/v1/platform/audit?size=100').flush([entry()]);

    expect(fixture.componentInstance.families()).toEqual([]);
    expect(fixture.componentInstance.entries()).toHaveLength(1);
  });

  it('reports a failure to load without leaving a blank screen', () => {
    const fixture = TestBed.createComponent(AuditPage);
    http.expectOne('/api/v1/platform/audit/families').flush(FAMILIES);
    http.expectOne('/api/v1/platform/audit?size=100').error(new ProgressEvent('error'));

    expect(fixture.componentInstance.loadError()).toBeTruthy();
  });
});
