import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { OrganizationList } from './organization-list';

describe('OrganizationList', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideAnimationsAsync()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
  });

  it('loadsTheFirstPageOnInit', () => {
    const fixture = TestBed.createComponent(OrganizationList);
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/platform/organizations' && r.params.get('page') === '0',
    );
    req.flush({
      items: [{ id: 1, name: 'Kaimana Noumea', taxCountry: 'NC', currency: 'XPF', active: true, salonCount: 2, createdAt: '2026-01-01T00:00:00Z' }],
      page: 0, size: 25, totalItems: 1, totalPages: 1,
    });

    expect(fixture.componentInstance.organizations()).toHaveLength(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('showsAnErrorWhenTheListCannotBeLoaded', () => {
    const fixture = TestBed.createComponent(OrganizationList);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === '/api/v1/platform/organizations')
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.errorMessage()).toBeTruthy();
  });

  it('searchesOnTheServerAndRestartsFromTheFirstPage', () => {
    const fixture = TestBed.createComponent(OrganizationList);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/v1/platform/organizations')
      .flush({ items: [], page: 0, size: 25, totalItems: 0, totalPages: 0 });

    fixture.componentInstance.page.set(2);

    vi.useFakeTimers();
    fixture.componentInstance.searchControl.setValue('noumea');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    const request = httpMock.expectOne((r) => r.url === '/api/v1/platform/organizations');
    expect(request.request.params.get('search')).toBe('noumea');
    expect(request.request.params.get('page')).toBe('0');
    request.flush({ items: [], page: 0, size: 25, totalItems: 0, totalPages: 0 });
  });
});
