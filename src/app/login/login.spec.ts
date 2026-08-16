import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { Login } from './login';

/**
 * L'ecran n'authentifie plus : il envoie vers le fournisseur. Ce qui se teste ici, c'est que le
 * depart reste **volontaire**, et que la page demandee survive au voyage.
 */
describe('Login', () => {
  function setup(queryParams: Record<string, string> = {}, data: Record<string, unknown> = {}) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams), data } },
        },
      ],
    });
    const login = vi.spyOn(TestBed.inject(AuthService), 'login').mockImplementation(() => {});
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return { fixture, login };
  }

  /**
   * <b>Arriver ne connecte personne.</b> Une redirection automatique rend l'arrivee
   * indistinguable d'une panne : le fournisseur reconnait sa session et renvoie aussitot, si bien
   * qu'on traverse deux redirections sans jamais rien voir — et sans pouvoir choisir un autre
   * compte.
   */
  it('doesNotConnectAnyoneOnArrival', () => {
    const { fixture, login } = setup();

    expect(login).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Se connecter');
  });

  it('carriesTheRequestedPageThroughTheRedirect', () => {
    const { fixture, login } = setup({ returnTo: '/salons' });

    fixture.nativeElement.querySelector('button').click();

    expect(login).toHaveBeenCalledWith('/salons');
  });

  /** Le refus du fournisseur se nomme, plutot que de relancer une redirection en boucle. */
  it('namesTheRefusalInsteadOfLoopingOnIt', () => {
    const { fixture, login } = setup({ erreur: 'refus' });

    expect(login).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('refusé');
  });

  it('staysSignedOutAfterADeliberateSignOut', () => {
    const { fixture, login } = setup({}, { signedOut: true });

    expect(login).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('déconnecté');
  });
});
