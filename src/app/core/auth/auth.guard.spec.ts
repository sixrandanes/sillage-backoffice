import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';

import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  function loginAsAdmin(): void {
    auth.login({ email: 'admin@kaimana.nc', password: 'x' }).subscribe();
    httpMock.expectOne('/api/platform/auth/login').flush({
      token: 't', adminId: 1, email: 'admin@kaimana.nc', firstName: 'A', lastName: 'B',
    });
  }

  function run<T>(guard: () => T): T {
    return TestBed.runInInjectionContext(guard) as T;
  }

  it('authGuardAllowsAnAuthenticatedAdmin', () => {
    loginAsAdmin();
    expect(run(() => authGuard({} as any, {} as any))).toBe(true);
  });

  it('authGuardRedirectsAnAnonymousUserToLogin', () => {
    const result = run(() => authGuard({} as any, {} as any));
    expect(result).toBeInstanceOf(UrlTree);
  });

  it('guestGuardAllowsAnAnonymousUser', () => {
    expect(run(() => guestGuard({} as any, {} as any))).toBe(true);
  });

  it('guestGuardRedirectsAnAuthenticatedAdminAway', () => {
    loginAsAdmin();
    const result = run(() => guestGuard({} as any, {} as any));
    expect(result).toBeInstanceOf(UrlTree);
  });
});
