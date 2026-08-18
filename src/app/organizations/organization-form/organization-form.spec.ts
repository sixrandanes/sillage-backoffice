import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { OrganizationForm } from './organization-form';

function activatedRouteStub(id: string) {
  return {
    snapshot: { paramMap: convertToParamMap({ id }) },
  } as unknown as ActivatedRoute;
}

describe('OrganizationForm', () => {
  let httpMock: HttpTestingController;

  const existingOrganization = {
    id: 9, name: 'Kaimana Noumea', taxCountry: 'NC', currency: 'XPF', billingAddress: '12 rue de l\'Alma', taxId: '1234567.001', active: true, salonCount: 2, createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: ActivatedRoute, useValue: activatedRouteStub('9') },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loadsTheExistingOrganizationIntoTheForm', () => {
    const fixture = TestBed.createComponent(OrganizationForm);

    httpMock.expectOne('/api/v1/platform/organizations/9').flush(existingOrganization);

    expect(fixture.componentInstance.form.controls.name.value).toBe('Kaimana Noumea');
    expect(fixture.componentInstance.salonCount()).toBe(2);
  });

  it('submitsTheUpdateAndNavigatesToTheList', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(OrganizationForm);
    httpMock.expectOne('/api/v1/platform/organizations/9').flush(existingOrganization);

    fixture.componentInstance.form.patchValue({ name: 'Kaimana Nouveau', active: false });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne('/api/v1/platform/organizations/9');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Kaimana Nouveau', taxCountry: 'NC', billingAddress: '12 rue de l\'Alma', taxId: '1234567.001', active: false });
    req.flush({ ...existingOrganization, name: 'Kaimana Nouveau', active: false });

    expect(navigateSpy).toHaveBeenCalledWith('/organizations');
  });

  it('doesNotSubmitAnInvalidForm', () => {
    const fixture = TestBed.createComponent(OrganizationForm);
    httpMock.expectOne('/api/v1/platform/organizations/9').flush(existingOrganization);

    fixture.componentInstance.form.controls.name.setValue('');
    fixture.componentInstance.submit();

    httpMock.expectNone((r) => r.method === 'PUT');
    expect(fixture.componentInstance.form.touched).toBe(true);
  });
});
