import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { PlatformAuthResponse } from './models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const authResponse: PlatformAuthResponse = {
    token: 'jwt-token',
    adminId: 1,
    email: 'admin@kaimana.nc',
    firstName: 'Sylvain',
    lastName: 'Le Borgne',
  };

  it('storesTheTokenAndPopulatesCurrentAdminOnLogin', () => {
    service.login({ email: 'admin@kaimana.nc', password: 'secret' }).subscribe();

    httpMock.expectOne('/api/platform/auth/login').flush(authResponse);

    expect(service.token).toBe('jwt-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentAdmin()?.email).toBe('admin@kaimana.nc');
  });

  it('logoutClearsTheTokenAndCurrentAdmin', () => {
    service.login({ email: 'admin@kaimana.nc', password: 'secret' }).subscribe();
    httpMock.expectOne('/api/platform/auth/login').flush(authResponse);

    service.logout();

    expect(service.token).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('restoreSessionReadsBackWhatWasStoredAtLogin', () => {
    service.login({ email: 'admin@kaimana.nc', password: 'secret' }).subscribe();
    httpMock.expectOne('/api/platform/auth/login').flush(authResponse);

    // Nouvelle instance de service : simule un rechargement de page.
    const restored = TestBed.inject(AuthService);
    restored.restoreSession();

    expect(restored.isAuthenticated()).toBe(true);
    expect(restored.currentAdmin()?.email).toBe('admin@kaimana.nc');
  });

  it('restoreSessionDoesNothingWithoutAStoredToken', () => {
    service.restoreSession();

    expect(service.isAuthenticated()).toBe(false);
  });

  it('restoreSessionLogsOutWhenTheStoredAdminIsCorrupted', () => {
    localStorage.setItem('kaimana-backoffice.token', 'jeton');
    localStorage.setItem('kaimana-backoffice.admin', 'not-json');

    service.restoreSession();

    expect(service.token).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
