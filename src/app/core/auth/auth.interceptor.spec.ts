import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  it('carriesTheTokenOnApiCalls', () => {
    auth.storeToken('un-jeton');

    http.get('/api/v1/platform/salons').subscribe();
    const req = httpMock.expectOne('/api/v1/platform/salons');

    expect(req.request.headers.get('Authorization')).toBe('Bearer un-jeton');
    req.flush([]);
  });

  /**
   * Il teste `/api` et non le prefixe versionne, deliberement : le jeton doit partir vers notre API
   * quelle que soit sa version. Le restreindre a la version courante ferait taire
   * l'authentification sur un appel laisse par megarde sur une autre — panne silencieuse, la ou un
   * 401 se voit.
   */
  it('leavesForeignUrlsAlone', () => {
    auth.storeToken('un-jeton');

    http.get('https://exemple.nc/donnees').subscribe();
    const req = httpMock.expectOne('https://exemple.nc/donnees');

    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('goesForAFreshTokenOnA401', () => {
    const reauthenticate = vi.spyOn(auth, 'reauthenticate').mockImplementation(() => {});
    auth.storeToken('un-jeton');

    http.get('/api/v1/platform/salons').subscribe({ error: () => {} });
    httpMock.expectOne('/api/v1/platform/salons')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(reauthenticate).toHaveBeenCalled();
  });

  /**
   * <b>Jamais sur un 403.</b> Ici il signifie « authentifie, mais absent de `platform_admins` » :
   * reconnecter bouclerait a l'infini, la reconnexion redonnant exactement le meme resultat.
   */
  it('neverReconnectsOnA403', () => {
    const reauthenticate = vi.spyOn(auth, 'reauthenticate').mockImplementation(() => {});
    auth.storeToken('un-jeton');

    http.get('/api/v1/platform/salons').subscribe({ error: () => {} });
    httpMock.expectOne('/api/v1/platform/salons')
      .flush({}, { status: 403, statusText: 'Forbidden' });

    expect(reauthenticate).not.toHaveBeenCalled();
  });

  /** `/me` **etablit** la session : reagir a son 401 relancerait une connexion en plein jugement. */
  it('doesNotReconnectWhenItIsTheSessionCheckThatFails', () => {
    const reauthenticate = vi.spyOn(auth, 'reauthenticate').mockImplementation(() => {});
    auth.storeToken('un-jeton');

    http.get('/api/v1/platform/auth/me').subscribe({ error: () => {} });
    httpMock.expectOne('/api/v1/platform/auth/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(reauthenticate).not.toHaveBeenCalled();
  });
});
