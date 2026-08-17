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
   * La marque du bandeau est en **creme**, pas en encre comme le favicon : l'encre disparaitrait
   * sur l'ardoise. Meme marque, adaptee a son fond — c'est a ca que servent les trois variantes,
   * et se tromper de variante donne un carre invisible que personne ne remarque en relisant le
   * gabarit.
   */
  it('carriesTheBrandMarkInTheVariantThatShowsOnTheSlateBar', () => {
    connect();
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    const marque: HTMLImageElement = fixture.nativeElement.querySelector('.shell-mark');
    expect(marque.getAttribute('src')).toBe('logo/icone-creme.svg');
    // `alt` vide : le mot « Sillage » juste a cote dit deja la meme chose.
    expect(marque.getAttribute('alt')).toBe('');
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
