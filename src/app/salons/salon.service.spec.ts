import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Territory } from '../tax/models';
import { SalonService } from './salon.service';

describe('SalonService', () => {
  let service: SalonService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SalonService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listsSalonsWithPaginationSearchAndOrganizationFilter', () => {
    service.list({ search: 'papeete', organizationId: 9, page: 0, size: 25 }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/platform/salons'
        && r.params.get('search') === 'papeete'
        && r.params.get('organizationId') === '9',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], page: 0, size: 25, totalItems: 0, totalPages: 0 });
  });

  it('listsSalonsWithoutAnOrganizationFilterByDefault', () => {
    service.list({ page: 0, size: 25 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/platform/salons');
    expect(req.request.params.has('organizationId')).toBe(false);
    req.flush({ items: [], page: 0, size: 25, totalItems: 0, totalPages: 0 });
  });

  it('getsASalonById', () => {
    service.get(1).subscribe();
    const req = httpMock.expectOne('/api/v1/platform/salons/1');
    expect(req.request.method).toBe('GET');
    req.flush(aSalon());
  });

  it('createsASalon', () => {
    service.create({
      organizationId: 9, name: 'Kaimana Papeete', address: null, phone: null, email: null, territory: Territory.TVA_PF,
    }).subscribe();

    const req = httpMock.expectOne('/api/v1/platform/salons');
    expect(req.request.method).toBe('POST');
    req.flush(aSalon());
  });

  it('updatesASalon', () => {
    service.update(1, {
      name: 'Kaimana Papeete', address: null, phone: null, email: null, territory: Territory.TVA_PF, active: false,
    }).subscribe();

    const req = httpMock.expectOne('/api/v1/platform/salons/1');
    expect(req.request.method).toBe('PUT');
    req.flush(aSalon());
  });

  function aSalon() {
    return {
      id: 1, organizationId: 9, organizationName: 'Kaimana SARL', name: 'Kaimana Papeete',
      address: null, phone: null, email: null, active: true,
      territory: Territory.TVA_PF, taxName: 'TVA', zoneId: 'Pacific/Tahiti', createdAt: '2026-01-01T00:00:00Z',
    };
  }
});
