import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { Shell } from './shell';

describe('Shell', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  function connect(): void {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    auth.storeToken(`entete.${payload}.signature`);
    auth.restoreSession().subscribe();
    httpMock.expectOne('/api/v1/platform/auth/me').flush({ id: 1, email: 'sylvain@sillage.nc' });
  }

  it('showsWhoIsConnected', () => {
    connect();
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('sylvain@sillage.nc');
  });

  /**
   * La deconnexion **quitte l'application** : elle va fermer la session chez le fournisseur, qui
   * nous ramene ensuite. Naviguer en plus ferait partir deux fois, et la seconde annulerait la
   * premiere — la personne se retrouverait reconnectee sans l'avoir demande.
   */
  it('revokesTheTokenBeforeLeavingForTheProvider', () => {
    connect();
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    fixture.componentInstance.logout();
    httpMock.expectOne('/api/v1/platform/auth/revoke').flush(null);
  });
});
