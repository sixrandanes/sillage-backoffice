import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

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
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('attachesTheTokenToApiRequestsOnly', () => {
    auth.login({ email: 'admin@kaimana.nc', password: 'x' }).subscribe();
    httpMock.expectOne('/api/platform/auth/login').flush({
      token: 'jwt-token', adminId: 1, email: 'admin@kaimana.nc', firstName: 'A', lastName: 'B',
    });

    http.get('/api/platform/tax/regimes/TGC/history').subscribe();
    const req = httpMock.expectOne('/api/platform/tax/regimes/TGC/history');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush([]);
  });

  it('leavesNonApiRequestsUntouched', () => {
    http.get('/assets/config.json').subscribe();
    const req = httpMock.expectOne('/assets/config.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('logsOutAndRedirectsToLoginOnA401', () => {
    auth.login({ email: 'admin@kaimana.nc', password: 'x' }).subscribe();
    httpMock.expectOne('/api/platform/auth/login').flush({
      token: 'jwt-token', adminId: 1, email: 'admin@kaimana.nc', firstName: 'A', lastName: 'B',
    });
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    http.get('/api/platform/tax/regimes/TGC/history').subscribe({ error: () => {} });
    httpMock.expectOne('/api/platform/tax/regimes/TGC/history')
        .flush('expire', { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
