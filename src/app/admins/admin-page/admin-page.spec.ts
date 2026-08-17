import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { PlatformAdmin } from '../models';
import { AdminPage } from './admin-page';

function admin(overrides: Partial<PlatformAdmin> = {}): PlatformAdmin {
  return {
    id: 1,
    email: 'sylvain@sillage.nc',
    firstName: 'Sylvain',
    lastName: 'Le Borgne',
    externalId: 'kp_sylvain',
    active: true,
    canConnect: true,
    self: true,
    createdAt: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('AdminPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: PlatformAdmin[] = [admin()]) {
    const fixture = TestBed.createComponent(AdminPage);
    http.expectOne('/api/v1/platform/admins').flush(rows);
    return { fixture, component: fixture.componentInstance };
  }

  it('lists the accounts', () => {
    const { component } = create();

    expect(component.admins()).toHaveLength(1);
  });

  /**
   * <b>Actif et pourtant inerte.</b> Une fiche sans identifiant du fournisseur n'ouvre aucun
   * accès : l'afficher « Actif » ferait croire l'accès ouvert, et on chercherait la panne ailleurs
   * — chez le fournisseur, dans le navigateur, partout sauf ici.
   */
  it('distinguishes an account that is active from one that can actually get in', () => {
    const { component } = create();

    expect(component.state(admin({ externalId: null, canConnect: false })).label).toBe(
      'En attente de rattachement',
    );
    expect(component.state(admin()).label).toBe('Actif');
    expect(component.state(admin({ active: false })).label).toBe('Désactivé');
  });

  /** L'ordre de lecture compte : désactivé prime sur non rattaché. */
  it('reads deactivated before unattached', () => {
    const { component } = create();

    expect(component.state(admin({ active: false, externalId: null })).label).toBe('Désactivé');
  });

  it('creates an account without a provider identifier', () => {
    const { component } = create();

    component.form.setValue({
      firstName: 'Marie',
      lastName: 'Wamytan',
      email: 'marie@sillage.nc',
      externalId: '',
    });
    component.submit();

    const request = http.expectOne('/api/v1/platform/admins');
    // `null`, jamais `''` : la chaîne vide compterait comme une valeur pour l'index unique du
    // serveur, et la deuxième fiche créée ainsi serait refusée sans rapport apparent.
    expect(request.request.body).toEqual({
      firstName: 'Marie',
      lastName: 'Wamytan',
      email: 'marie@sillage.nc',
      externalId: null,
    });
    request.flush(admin({ id: 2, externalId: null, canConnect: false, self: false }));
    http.expectOne('/api/v1/platform/admins').flush([]);
  });

  /** Le chemin qui évite de rouvrir une session SQL sur la production. */
  it('repairs a mistyped provider identifier through an update', () => {
    const { component } = create();
    component.edit(admin({ id: 3, externalId: 'kp_faute', self: false }));

    component.form.controls.externalId.setValue('kp_correct');
    component.submit();

    const request = http.expectOne('/api/v1/platform/admins/3');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.externalId).toBe('kp_correct');
    request.flush(admin({ id: 3, externalId: 'kp_correct', self: false }));
    http.expectOne('/api/v1/platform/admins').flush([]);
  });

  /**
   * <b>Le refus du serveur s'affiche tel quel.</b> Lui seul sait dire qu'on s'apprête à retirer le
   * dernier accès — un message générique perdrait ce qui aide à corriger.
   */
  it('shows the server refusal verbatim when removing the last way in', () => {
    const { component } = create();

    component.deactivate(admin());

    http.expectOne('/api/v1/platform/admins/1/deactivate').flush(
      {
        message:
          'Impossible de desactiver le dernier compte capable de se connecter : plus personne ne pourrait administrer la plateforme.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    expect(component.formError()).toContain('plus personne ne pourrait administrer');
  });

  /** Désactiver son propre compte est légitime, mais ne doit pas se faire sans le savoir. */
  it('says plainly when you have just cut your own access', () => {
    const { component } = create();

    component.deactivate(admin({ self: true }));

    http.expectOne('/api/v1/platform/admins/1/deactivate').flush(admin({ active: false }));
    http.expectOne('/api/v1/platform/admins').flush([]);
    expect(component.done()).toContain('Votre propre accès');
  });

  it('brings someone back', () => {
    const { component } = create();

    component.reactivate(admin({ active: false }));

    http.expectOne('/api/v1/platform/admins/1/reactivate').flush(admin());
    http.expectOne('/api/v1/platform/admins').flush([]);
    expect(component.done()).toBe('Accès rétabli.');
  });

  /**
   * Supprimer n'est proposé que là où le serveur l'accepte : offrir un bouton dont on connaît le
   * refus d'avance est une invitation à se cogner.
   */
  it('offers deletion only on a account that was never attached', () => {
    const { component } = create();

    expect(component.canDelete(admin({ externalId: null }))).toBe(true);
    expect(component.canDelete(admin({ externalId: 'kp_sylvain' }))).toBe(false);
  });

  it('deletes a never-attached account', () => {
    const { component } = create();

    component.delete(admin({ id: 4, externalId: null, self: false }));

    http.expectOne('/api/v1/platform/admins/4').flush(null);
    http.expectOne('/api/v1/platform/admins').flush([]);
    expect(component.done()).toBe('Fiche supprimée.');
  });

  it('reports a failure to load without leaving a blank screen', () => {
    const fixture = TestBed.createComponent(AdminPage);
    http.expectOne('/api/v1/platform/admins').error(new ProgressEvent('error'));

    expect(fixture.componentInstance.loadError()).toBeTruthy();
  });
});
