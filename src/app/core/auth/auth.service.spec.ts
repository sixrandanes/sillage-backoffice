import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

/**
 * Le backoffice n'authentifie plus : il redirige. Ce qui se teste ici, c'est donc la lecture de la
 * session — et surtout la distinction entre « le jeton ne vaut rien » et « vous n'etes pas
 * administrateur », qui n'appellent pas la meme suite.
 */
describe('AuthService', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /**
   * <b>On demande toujours au serveur.</b> Il n'y a plus de jeton local a inspecter pour deviner
   * si l'on a une session : le cookie voyage seul, et c'est la reponse qui tranche. Demander est
   * aussi rapide que deviner, et ne peut pas se tromper.
   */
  it('alwaysAsksTheServerBecauseTheBrowserHoldsNothingToGuessFrom', () => {
    auth.restoreSession().subscribe();

    httpMock.expectOne('/api/v1/platform/auth/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('readsWhoIsConnectedFromTheServer', () => {
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
  it('flagsTheAdminAsUnknownOnA403', () => {
    auth.restoreSession().subscribe();
    httpMock.expectOne('/api/v1/platform/auth/me')
      .flush({}, { status: 403, statusText: 'Forbidden' });

    // La session **serveur** est intacte : c'est le rattachement qui manque, pas l'authentification.
    // Reconnecter redonnerait exactement le meme resultat.
    expect(auth.unknownAdmin()).toBe(true);
  });

  /** Un 401 dit que la session ne vaut plus rien : on oublie ce qu'on croyait savoir. */
  it('clearsWhatWeThoughtWeKnewOnA401', () => {
    auth.restoreSession().subscribe();
    httpMock.expectOne('/api/v1/platform/auth/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.unknownAdmin()).toBe(false);
  });

  /**
   * <b>Le balayage compte plus que jamais.</b> Un navigateur deja ouvert porte encore le jeton du
   * modele precedent, dans le `localStorage` : il ne sert plus a rien, et un jeton qui traine est
   * precisement ce que ce changement existe pour supprimer.
   */
  it('sweepsTheTokensLeftBehindByTheFormerModel', () => {
    localStorage.setItem('sillage-backoffice.token', 'jeton-d-avant-le-cookie');
    localStorage.setItem('kaimana-backoffice.token', 'plus ancien encore');

    auth.forgetSession();

    expect(localStorage.getItem('sillage-backoffice.token')).toBeNull();
    expect(localStorage.getItem('kaimana-backoffice.token')).toBeNull();
  });

  /** La deconnexion revoque toujours : c'est le serveur qui detient le jeton et ferme la session. */
  it('alwaysRevokesBecauseTheServerIsTheOneHoldingTheToken', () => {
    auth.logout();

    httpMock.expectOne('/api/v1/platform/auth/revoke').flush(null);
  });
});
