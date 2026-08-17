import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { UserAdmin } from '../user.models';
import { OrganizationUsers } from './organization-users';

const URL = '/api/v1/platform/organizations/7/users';

function user(overrides: Partial<UserAdmin> = {}): UserAdmin {
  return {
    id: 1,
    email: 'marie@salon.nc',
    firstName: 'Marie',
    lastName: 'Wamytan',
    active: true,
    organizationOwner: true,
    linked: true,
    access: 'OK',
    accessLabel: "Rien ne l'empêche de se connecter",
    salonRoles: [],
    ...overrides,
  };
}

describe('OrganizationUsers', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationUsers],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: UserAdmin[] = [user()]) {
    const fixture = TestBed.createComponent(OrganizationUsers);
    fixture.componentRef.setInput('organizationId', 7);
    fixture.detectChanges();
    http.expectOne(URL).flush(rows);
    return { fixture, component: fixture.componentInstance };
  }

  /** Les routes sont nichées sous l'organisation : le chemin porte le cloisonnement. */
  it('reads the accounts of that organisation and no other', () => {
    const { component } = create();

    expect(component.users()).toHaveLength(1);
  });

  /**
   * <b>Ce que le support venait chercher.</b> Trois états qui ne veulent pas dire la même chose :
   * ce qui bloque, ce qui se règlera tout seul à la prochaine connexion, et ce qui va bien.
   */
  it('separates what is blocked from what will sort itself out', () => {
    const { component } = create();

    expect(component.severity(user({ access: 'ACCOUNT_DISABLED' }))).toBe('blocked');
    expect(component.severity(user({ access: 'ORGANIZATION_DISABLED' }))).toBe('blocked');
    expect(component.severity(user({ access: 'AWAITING_LINK' }))).toBe('waiting');
    expect(component.severity(user({ access: 'OK' }))).toBe('ok');
  });

  it('brings back an account deactivated by mistake', () => {
    const { component } = create([user({ active: false, access: 'ACCOUNT_DISABLED' })]);

    component.reactivate(user({ active: false }));

    const request = http.expectOne(`${URL}/1/active`);
    expect(request.request.body).toEqual({ active: true });
    request.flush(user());
    http.expectOne(URL).flush([user()]);
    expect(component.done()).toContain('peut de nouveau se connecter');
  });

  it('appoints an owner when nobody is left to manage the company', () => {
    const { component } = create();

    component.grantOwner(user({ organizationOwner: false }));

    const request = http.expectOne(`${URL}/1/owner`);
    expect(request.request.body).toEqual({ owner: true });
    request.flush(user());
    http.expectOne(URL).flush([user()]);
  });

  /**
   * Le geste subtil : il ne pose aucune identité, il en retire une — et le message doit dire ce
   * qui va se passer ensuite, sinon on croit que rien n'a été fait.
   */
  it('detaches a stale identity and says what happens next', () => {
    const { component } = create();

    component.unlink(user());

    http.expectOne(`${URL}/1/unlink-identity`).flush(user({ linked: false, access: 'AWAITING_LINK' }));
    http.expectOne(URL).flush([user({ linked: false })]);
    expect(component.done()).toContain('prochaine connexion');
  });

  it('corrects the address the claim keys on', () => {
    const { component } = create();
    component.editEmail(user());

    component.emailControl.setValue('  marie.wamytan@salon.nc  ');
    component.saveEmail();

    const request = http.expectOne(`${URL}/1/email`);
    expect(request.request.body).toEqual({ email: 'marie.wamytan@salon.nc' });
    request.flush(user({ email: 'marie.wamytan@salon.nc' }));
    http.expectOne(URL).flush([user()]);
    expect(component.editingEmail()).toBeNull();
  });

  /**
   * <b>Le refus du serveur s'affiche tel quel</b> : lui seul sait qu'on s'apprête à retirer le
   * dernier propriétaire actif.
   */
  it('shows the server refusal verbatim rather than a generic message', () => {
    const { component } = create();

    component.deactivate(user());

    http.expectOne(`${URL}/1/active`).flush(
      {
        message:
          "Ce compte est le dernier proprietaire actif de l'entreprise : la desactiver ne laisserait personne pour gerer l'equipe.",
      },
      { status: 409, statusText: 'Conflict' },
    );
    expect(component.actionError()).toContain('dernier proprietaire actif');
  });

  it('reports a failure to load without leaving a blank panel', () => {
    const fixture = TestBed.createComponent(OrganizationUsers);
    fixture.componentRef.setInput('organizationId', 7);
    fixture.detectChanges();
    http.expectOne(URL).error(new ProgressEvent('error'));

    expect(fixture.componentInstance.loadError()).toBeTruthy();
  });

  it('names the roles in French', () => {
    const { component } = create();

    expect(component.roleLabel('MANAGER')).toBe('Gérant·e');
    expect(component.roleLabel('ACCOUNTANT')).toBe('Comptable');
  });
});
