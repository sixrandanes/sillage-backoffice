import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { TOKEN_KEY } from '../storage-keys';

/**
 * Le backoffice n'authentifie plus : il redirige. Ce qui se teste ici, c'est donc la lecture de la
 * session — et surtout la distinction entre « le jeton ne vaut rien » et « vous n'etes pas
 * administrateur », qui n'appellent pas la meme suite.
 */
describe('AuthService', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;

  /** Un jeton lisible et valide : sa signature n'est jamais lue cote client. */
  function aValidToken(secondsFromNow = 3600): string {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow }));
    return `entete.${payload}.signature`;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('doesNotAskTheServerWithoutAToken', () => {
    auth.restoreSession().subscribe();
    // Aucune requete : `httpMock.verify()` echouerait s'il en partait une.
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('readsWhoIsConnectedFromTheServer', () => {
    auth.storeToken(aValidToken());

    auth.restoreSession().subscribe();
    httpMock.expectOne('/api/v1/platform/auth/me').flush({ id: 1, email: 'sylvain@sillage.nc' });

    expect(auth.currentAdmin()?.email).toBe('sylvain@sillage.nc');
  });

  /**
   * <b>Le cas qui distingue ce backoffice de l'application des salons.</b> Le rattachement a
   * `platform_admins` est **manuel** — on ne devient pas administrateur plateforme en se
   * connectant. Un 403 signifie donc « authentifie, mais pas des notres » : effacer le jeton
   * renverrait se connecter en boucle pour revenir exactement au meme point.
   */
  it('keepsTheTokenAndFlagsTheAdminAsUnknownOnA403', () => {
    auth.storeToken(aValidToken());

    auth.restoreSession().subscribe();
    httpMock.expectOne('/api/v1/platform/auth/me')
      .flush({}, { status: 403, statusText: 'Forbidden' });

    expect(auth.unknownAdmin()).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();
  });

  /** Un 401, lui, dit que le jeton ne vaut plus rien : on l'oublie. */
  it('clearsTheSessionOnA401', () => {
    auth.storeToken(aValidToken());

    auth.restoreSession().subscribe();
    httpMock.expectOne('/api/v1/platform/auth/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  /**
   * Les anciens jetons etaient signes par Sillage et sont desormais refuses. La cle a change pour
   * qu'un navigateur deja ouvert ne reparte pas avec l'un d'eux, rejete a chaque requete sans que
   * rien ne l'explique.
   */
  it('sweepsTheKeysOfTheFormerAuthentication', () => {
    localStorage.setItem('kaimana-backoffice.token', 'ancien');
    localStorage.setItem('kaimana-backoffice.admin', '{}');

    auth.forgetSession();

    expect(localStorage.getItem('kaimana-backoffice.token')).toBeNull();
    expect(localStorage.getItem('kaimana-backoffice.admin')).toBeNull();
  });

  it('treatsAnUnreadableOrExpiredTokenAsExpired', () => {
    expect(auth.isTokenExpired()).toBe(true);

    auth.storeToken('pas-un-jeton');
    expect(auth.isTokenExpired()).toBe(true);

    auth.storeToken(aValidToken(-1));
    expect(auth.isTokenExpired()).toBe(true);

    auth.storeToken(aValidToken());
    expect(auth.isTokenExpired()).toBe(false);
  });
});
