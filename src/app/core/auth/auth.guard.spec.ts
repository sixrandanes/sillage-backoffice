import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';

import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;

  function aValidToken(secondsFromNow = 3600): string {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow }));
    return `entete.${payload}.signature`;
  }

  function connect(secondsFromNow = 3600): void {
    auth.storeToken(aValidToken(secondsFromNow));
    auth.restoreSession().subscribe();
    httpMock.expectOne('/api/v1/platform/auth/me').flush({ id: 1, email: 'sylvain@sillage.nc' });
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function run<T>(guard: () => T): T {
    return TestBed.runInInjectionContext(guard) as T;
  }

  it('letsAConnectedAdminThrough', () => {
    connect();
    expect(run(() => authGuard({} as any, { url: '/salons' } as any))).toBe(true);
  });

  it('sendsAnAnonymousVisitorToTheLoginScreen', () => {
    expect(run(() => authGuard({} as any, { url: '/salons' } as any))).toBeInstanceOf(UrlTree);
  });

  /**
   * Le cas qui manquait : un jeton expirant **pendant** que l'application etait ouverte. Sans ce
   * garde, on laisserait naviguer normalement puis chaque appel echouerait — l'ecran se remplirait
   * d'erreurs sans que rien n'explique pourquoi.
   */
  it('goesForAFreshTokenWhenTheCurrentOneHasExpired', () => {
    connect();
    auth.storeToken(aValidToken(-1));
    const reauthenticate = vi.spyOn(auth, 'reauthenticate').mockImplementation(() => {});

    expect(run(() => authGuard({} as any, { url: '/salons' } as any))).toBe(false);
    expect(reauthenticate).toHaveBeenCalledWith('/salons');
  });

  it('keepsAConnectedAdminAwayFromTheLoginScreen', () => {
    connect();
    expect(run(() => guestGuard({} as any, {} as any))).toBeInstanceOf(UrlTree);
  });
});
