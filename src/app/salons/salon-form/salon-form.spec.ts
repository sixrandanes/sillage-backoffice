import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { TaxRegime, TaxRegimeInfo } from '../../tax/models';
import { SalonForm } from './salon-form';

function activatedRouteStub(id: string | null) {
  return {
    snapshot: { paramMap: convertToParamMap(id ? { id } : {}) },
  } as unknown as ActivatedRoute;
}

const REGIMES: TaxRegimeInfo[] = [
  { regime: TaxRegime.TGC, territoryCode: 'NC', territoryLabel: 'Nouvelle-Calédonie', taxName: 'TGC', taxLabel: 'TGC', rates: [] },
  { regime: TaxRegime.TVA_PF, territoryCode: 'PF', territoryLabel: 'Polynésie française', taxName: 'TVA', taxLabel: 'TVA', rates: [] },
];

describe('SalonForm — creation', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalonForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: ActivatedRoute, useValue: activatedRouteStub(null) },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function flushInit() {
    httpMock.expectOne((r) => r.url === '/api/platform/tax/regimes').flush(REGIMES);
    httpMock.expectOne((r) => r.url === '/api/platform/organizations').flush({
      items: [{ id: 9, name: 'Kaimana SARL', taxCountry: 'NC', currency: 'XPF', active: true, salonCount: 0, createdAt: '2026-01-01T00:00:00Z' }],
      page: 0, size: 100, totalItems: 1, totalPages: 1,
    });
  }

  it('loadsTheOrganizationChoicesAndTaxRegimes', () => {
    const fixture = TestBed.createComponent(SalonForm);
    flushInit();

    expect(fixture.componentInstance.organizations()).toHaveLength(1);
    expect(fixture.componentInstance.regimes()).toHaveLength(2);
    expect(fixture.componentInstance.salonId).toBeNull();
  });

  it('doesNotSubmitAnInvalidForm', () => {
    const fixture = TestBed.createComponent(SalonForm);
    flushInit();

    fixture.componentInstance.submit();

    httpMock.expectNone('/api/platform/salons');
    expect(fixture.componentInstance.form.touched).toBe(true);
  });

  it('createsASalonForTheChosenOrganizationAndNavigatesToTheList', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(SalonForm);
    flushInit();

    fixture.componentInstance.form.patchValue({
      organizationId: 9, name: 'Kaimana Papeete', taxRegime: TaxRegime.TVA_PF,
    });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne('/api/platform/salons');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      organizationId: 9, name: 'Kaimana Papeete', address: null, phone: null, email: null, taxRegime: TaxRegime.TVA_PF,
    });
    req.flush({
      id: 1, organizationId: 9, organizationName: 'Kaimana SARL', name: 'Kaimana Papeete',
      address: null, phone: null, email: null, active: true, taxRegime: TaxRegime.TVA_PF, taxName: 'TVA', createdAt: '2026-01-01T00:00:00Z',
    });

    expect(navigateSpy).toHaveBeenCalledWith('/salons');
  });
});

describe('SalonForm — edition', () => {
  let httpMock: HttpTestingController;

  const existingSalon = {
    id: 7, organizationId: 9, organizationName: 'Kaimana SARL', name: 'Kaimana Noumea',
    address: 'Noumea', phone: '123', email: null, active: true,
    taxRegime: TaxRegime.TGC, taxName: 'TGC', createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalonForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: ActivatedRoute, useValue: activatedRouteStub('7') },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loadsTheExistingSalonWithoutAnOrganizationPicker', () => {
    const fixture = TestBed.createComponent(SalonForm);

    httpMock.expectOne((r) => r.url === '/api/platform/tax/regimes').flush(REGIMES);
    httpMock.expectOne('/api/platform/salons/7').flush(existingSalon);

    expect(fixture.componentInstance.form.controls.name.value).toBe('Kaimana Noumea');
    expect(fixture.componentInstance.organizationName()).toBe('Kaimana SARL');
    httpMock.expectNone((r) => r.url === '/api/platform/organizations');
  });

  it('submitsAnUpdateWithoutTheOrganizationId', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(SalonForm);
    httpMock.expectOne((r) => r.url === '/api/platform/tax/regimes').flush(REGIMES);
    httpMock.expectOne('/api/platform/salons/7').flush(existingSalon);

    fixture.componentInstance.form.patchValue({ active: false });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne('/api/platform/salons/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: 'Kaimana Noumea', address: 'Noumea', phone: '123', email: null, taxRegime: TaxRegime.TGC, active: false,
    });
    req.flush({ ...existingSalon, active: false });

    expect(navigateSpy).toHaveBeenCalledWith('/salons');
  });
});
