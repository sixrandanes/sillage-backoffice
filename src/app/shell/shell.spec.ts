import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { Shell } from './shell';

describe('Shell', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('showsTheNameOfTheConnectedAdmin', () => {
    auth.login({ email: 'admin@kaimana.nc', password: 'x' }).subscribe();
    httpMock.expectOne('/api/v1/platform/auth/login').flush({
      token: 't', adminId: 1, email: 'admin@kaimana.nc', firstName: 'Sylvain', lastName: 'Le Borgne',
    });

    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    expect(fixture.componentInstance.currentAdmin()?.firstName).toBe('Sylvain');
  });

  it('logoutClearsTheSessionAndNavigatesToLogin', () => {
    auth.login({ email: 'admin@kaimana.nc', password: 'x' }).subscribe();
    httpMock.expectOne('/api/v1/platform/auth/login').flush({
      token: 't', adminId: 1, email: 'admin@kaimana.nc', firstName: 'A', lastName: 'B',
    });
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    fixture.componentInstance.logout();

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
