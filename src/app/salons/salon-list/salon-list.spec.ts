import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { TaxRegime } from '../../tax/models';
import { SalonList } from './salon-list';

describe('SalonList', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalonList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideAnimationsAsync()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
  });

  function flushOrganizations(fixture: ComponentFixture<SalonList>) {
    httpMock.expectOne((r) => r.url === '/api/v1/platform/organizations').flush({
      items: [{ id: 9, name: 'Kaimana SARL', taxCountry: 'NC', currency: 'XPF', active: true, salonCount: 1, createdAt: '2026-01-01T00:00:00Z' }],
      page: 0, size: 100, totalItems: 1, totalPages: 1,
    });
  }

  it('loadsOrganizationsForTheFilterAndSalonsForTheList', () => {
    const fixture = TestBed.createComponent(SalonList);
    fixture.detectChanges();

    flushOrganizations(fixture);
    httpMock.expectOne((r) => r.url === '/api/v1/platform/salons').flush({
      items: [{
        id: 1, organizationId: 9, organizationName: 'Kaimana SARL', name: 'Kaimana Noumea',
        address: null, phone: null, email: null, active: true, taxRegime: TaxRegime.TGC, taxName: 'TGC', createdAt: '2026-01-01T00:00:00Z',
      }],
      page: 0, size: 25, totalItems: 1, totalPages: 1,
    });

    expect(fixture.componentInstance.organizations()).toHaveLength(1);
    expect(fixture.componentInstance.salons()).toHaveLength(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('filtersByOrganizationAndRestartsFromTheFirstPage', () => {
    const fixture = TestBed.createComponent(SalonList);
    fixture.detectChanges();
    flushOrganizations(fixture);
    httpMock.expectOne((r) => r.url === '/api/v1/platform/salons')
      .flush({ items: [], page: 0, size: 25, totalItems: 0, totalPages: 0 });

    fixture.componentInstance.page.set(2);
    fixture.componentInstance.organizationControl.setValue(9);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/platform/salons');
    expect(req.request.params.get('organizationId')).toBe('9');
    expect(req.request.params.get('page')).toBe('0');
    req.flush({ items: [], page: 0, size: 25, totalItems: 0, totalPages: 0 });
  });

  it('showsAnErrorWhenTheListCannotBeLoaded', () => {
    const fixture = TestBed.createComponent(SalonList);
    fixture.detectChanges();
    flushOrganizations(fixture);

    httpMock.expectOne((r) => r.url === '/api/v1/platform/salons')
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.errorMessage()).toBeTruthy();
  });
});
