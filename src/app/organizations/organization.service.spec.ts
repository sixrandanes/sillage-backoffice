import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listsOrganizationsWithPaginationAndSearch', () => {
    service.list({ search: 'noumea', page: 1, size: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/platform/organizations'
        && r.params.get('search') === 'noumea'
        && r.params.get('page') === '1'
        && r.params.get('size') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], page: 1, size: 10, totalItems: 0, totalPages: 0 });
  });

  it('getsAnOrganizationById', () => {
    service.get(9).subscribe();
    const req = httpMock.expectOne('/api/v1/platform/organizations/9');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 9, name: 'Kaimana', taxCountry: 'NC', currency: 'XPF', active: true, salonCount: 0, createdAt: '2026-01-01T00:00:00Z' });
  });

  it('updatesAnOrganization', () => {
    service.update(9, { name: 'Kaimana Nouveau', taxCountry: 'NC', active: false }).subscribe();

    const req = httpMock.expectOne('/api/v1/platform/organizations/9');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Kaimana Nouveau', taxCountry: 'NC', active: false });
    req.flush({ id: 9, name: 'Kaimana Nouveau', taxCountry: 'NC', currency: 'XPF', active: false, salonCount: 0, createdAt: '2026-01-01T00:00:00Z' });
  });
});
