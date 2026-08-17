import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';

import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;

  /** « Etre connecte » veut desormais dire : `/me` a repondu. Il n'y a plus de jeton local. */
  function connect(): void {
    auth.restoreSession().subscribe();
    httpMock.expectOne('/api/v1/platform/auth/me').flush({ id: 1, email: 'sylvain@sillage.nc' });
  }

  /** Et « pas connecte » : `/me` a refuse. */
  function stayAnonymous(): void {
    auth.restoreSession().subscribe();
    httpMock.expectOne('/api/v1/platform/auth/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
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
    stayAnonymous();
    expect(run(() => authGuard({} as any, { url: '/salons' } as any))).toBeInstanceOf(UrlTree);
  });

  /**
   * <b>Le garde n'inspecte plus aucune echeance</b>, et c'est une consequence directe du passage au
   * cookie : le navigateur ne detient plus de jeton. Une expiration survenue **pendant** l'ecran se
   * rattrape la ou elle se manifeste — sur le 401 que l'intercepteur intercepte — et une
   * verification locale ne pouvait de toute facon jamais faire mieux que le serveur.
   */
  it('leavesExpiryToTheServerBecauseTheBrowserHasNothingToInspect', () => {
    connect();

    expect(run(() => authGuard({} as any, { url: '/salons' } as any))).toBe(true);
  });

  it('keepsAConnectedAdminAwayFromTheLoginScreen', () => {
    connect();
    expect(run(() => guestGuard({} as any, {} as any))).toBeInstanceOf(UrlTree);
  });
});
