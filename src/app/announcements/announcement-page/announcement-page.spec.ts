import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';

import { AnnouncementView } from '../models';
import { AnnouncementPage } from './announcement-page';

const URL = '/api/v1/platform/announcements';

function announcement(overrides: Partial<AnnouncementView> = {}): AnnouncementView {
  return {
    id: 1,
    message: 'Maintenance programmée samedi de 20 h à 22 h.',
    level: 'WARNING',
    levelLabel: 'Avertissement',
    startsAt: '2026-08-18T09:00:00Z',
    endsAt: '2026-08-25T09:00:00Z',
    status: 'ACTIVE',
    statusLabel: 'En cours',
    createdBy: 'Support plateforme — marie@sillage.nc',
    createdAt: '2026-08-18T08:00:00Z',
    ...overrides,
  };
}

describe('AnnouncementPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AnnouncementPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create(rows: AnnouncementView[] = [announcement()]) {
    const fixture = TestBed.createComponent(AnnouncementPage);
    http.expectOne(URL).flush(rows);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('lists what the salons are being told', () => {
    const { component } = create();

    expect(component.announcements()).toHaveLength(1);
    expect(component.active()).toHaveLength(1);
  });

  /**
   * `datetime-local` rend une heure **locale sans fuseau**. L'envoyer telle quelle ferait lire au
   * serveur une heure UTC — onze heures d'écart depuis Nouméa, et un message affiché le lendemain.
   */
  it('sends an instant and not the local wall-clock string it was typed as', () => {
    const { component } = create();
    component.form.patchValue({
      message: 'Nouvelle version disponible.',
      level: 'INFO',
      startsAt: '2026-09-01T08:00',
      endsAt: '2026-09-08T08:00',
    });

    component.submit();

    const request = http.expectOne((r) => r.method === 'POST' && r.url === URL);
    expect(request.request.body.startsAt).toBe(new Date('2026-09-01T08:00').toISOString());
    expect(request.request.body.startsAt).toMatch(/Z$/);
    request.flush(announcement());
    http.expectOne(URL).flush([]);
  });

  /**
   * Le champ pré-rempli doit s'ouvrir sur **maintenant**, pas sur la veille au soir : `toISOString`
   * donnerait de l'UTC, donc onze heures de moins depuis Nouméa.
   */
  it('prefills the window in local time and not in utc', () => {
    const { component } = create();

    const startsAt = component.form.getRawValue().startsAt;
    expect(startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(startsAt).getHours()).toBe(new Date().getHours());
  });

  /** La fin avant le début est refusée sans aller-retour : la faute se voit à l'écran. */
  it('refuses a window that ends before it starts without asking the server', () => {
    const { component } = create();
    component.form.patchValue({
      message: 'À l’envers',
      level: 'INFO',
      startsAt: '2026-09-08T08:00',
      endsAt: '2026-09-01T08:00',
    });

    component.submit();

    expect(component.error()).toContain('après son début');
    http.expectNone((r) => r.method === 'POST');
  });

  /**
   * <b>La suppression demande une confirmation.</b> Retirer un message en cours le fait disparaître
   * de l'écran de **tous** les clients, et rien ne le rattrape : il n'existe pas de modification,
   * donc pas d'annulation. Un premier clic ne doit donc rien envoyer.
   */
  it('does not delete on the first click', () => {
    const { component } = create();

    component.askDeletion(announcement());

    expect(component.pendingDeletion()).toBe(1);
    http.expectNone((r) => r.method === 'DELETE');
  });

  it('deletes once confirmed', () => {
    const { component } = create();
    component.askDeletion(announcement());

    component.confirmDeletion(announcement());

    http.expectOne((r) => r.method === 'DELETE' && r.url === `${URL}/1`).flush(null);
    expect(component.pendingDeletion()).toBeNull();
    http.expectOne(URL).flush([]);
  });

  it('lets the operator step back from a deletion', () => {
    const { component } = create();
    component.askDeletion(announcement());

    component.cancelDeletion();

    expect(component.pendingDeletion()).toBeNull();
    http.expectNone((r) => r.method === 'DELETE');
  });

  /**
   * Le refus du serveur s'affiche tel quel : lui seul sait qu'une période est déjà passée ou trop
   * longue, et un message générique perdrait ce qui aide à corriger.
   */
  it('shows the server refusal verbatim', () => {
    const { component } = create();
    component.form.patchValue({
      message: 'Trop long',
      level: 'INFO',
      startsAt: '2026-09-01T08:00',
      endsAt: '2027-09-01T08:00',
    });

    component.submit();
    http.expectOne((r) => r.method === 'POST').flush(
      { message: 'Un message ne peut pas rester affiché plus de 180 jours.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(component.error()).toContain('180 jours');
  });

  /** Le compteur doit dire la vérité avant l'envoi : un bandeau tronqué serait pire qu'un court. */
  it('counts what is left to write', () => {
    const { component } = create();
    component.form.patchValue({ message: 'abc' });

    expect(component.remaining()).toBe(component.maxMessageLength - 3);
  });
});
