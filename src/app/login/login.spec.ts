import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Login } from './login';

describe('Login', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('doesNotSubmitAnInvalidForm', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.submit();

    httpMock.expectNone('/api/platform/auth/login');
    expect(fixture.componentInstance.form.touched).toBe(true);
  });

  it('navigatesHomeAfterASuccessfulLogin', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.form.setValue({ email: 'admin@kaimana.nc', password: 'SuperSecret123' });

    fixture.componentInstance.submit();

    httpMock.expectOne('/api/platform/auth/login').flush({
      token: 'jwt-token',
      adminId: 1,
      email: 'admin@kaimana.nc',
      firstName: 'A',
      lastName: 'B',
    });

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('showsAnErrorMessageOnInvalidCredentials', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.form.setValue({ email: 'admin@kaimana.nc', password: 'wrong' });

    fixture.componentInstance.submit();

    httpMock.expectOne('/api/platform/auth/login').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(fixture.componentInstance.errorMessage()).toBeTruthy();
    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
