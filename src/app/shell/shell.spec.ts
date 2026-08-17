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

  /**
   * Sert les deux lectures de version faites au demarrage du shell.
   *
   * Sans elles, `httpMock.verify()` echouerait sur des requetes en attente — et le message
   * pointerait vers la version, pas vers ce que le test essaie de verifier.
   */
  function flushVersions(): void {
    httpMock.expectOne('/version.json').flush({ commit: 'aaaaaaa', builtAt: '2026-08-17T09:00:00Z' });
    httpMock.expectOne('/api/v1/version').flush({ commit: 'bbbbbbb', builtAt: '2026-08-17T08:00:00Z' });
  }

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
    flushVersions();

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

    flushVersions();
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

    flushVersions();
    fixture.componentInstance.logout();
    httpMock.expectOne('/api/v1/platform/auth/revoke').flush(null);
  });

  /**
   * Les deux conteneurs se deploient separement : l'un peut etre a jour et l'autre non, et c'est
   * exactement le cas ou l'on cherche a comprendre. Les deux versions doivent donc etre lisibles
   * cote a cote, sans navigation.
   */
  it('showsBothContainerVersionsSideBySide', () => {
    connect();
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    flushVersions();
    fixture.detectChanges();

    const pied: string = fixture.nativeElement.querySelector('.shell-versions').textContent;
    expect(pied).toContain('aaaaaaa');
    expect(pied).toContain('bbbbbbb');
  });

  /**
   * <b>Un echec se dit, il ne se cache pas.</b> Masquer la ligne ferait disparaitre l'information
   * au moment ou elle compte : ne pas pouvoir lire la version du serveur **est** un diagnostic.
   */
  it('saysUnknownRatherThanHidingAVersionItCouldNotRead', () => {
    connect();
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    httpMock.expectOne('/version.json').flush({ commit: 'aaaaaaa', builtAt: null });
    httpMock.expectOne('/api/v1/version').error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.shell-versions').textContent).toContain('inconnue');
  });

});
