import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SalonArchive } from '../archive.models';
import { SalonArchives } from './salon-archives';

const ARCHIVES = '/api/v1/platform/salons/4/accounting/archives';
const PENDING = `${ARCHIVES}/pending`;

function archive(overrides: Partial<SalonArchive> = {}): SalonArchive {
  return {
    id: 7,
    archiveNumber: 2,
    businessYear: 2025,
    saleCount: 1840,
    refundCount: 12,
    closureCount: 301,
    auditEntryCount: 4200,
    netAmount: '18400000',
    taxAmount: '1932000',
    integrityVerified: true,
    integrityAnomalies: 0,
    contentLength: 3355443,
    contentHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    createdAt: '2026-01-04T20:15:00Z',
    ...overrides,
  };
}

describe('SalonArchives', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SalonArchives],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function create(rows: SalonArchive[] = [archive()], pendingYears: number[] = []) {
    const fixture = TestBed.createComponent(SalonArchives);
    fixture.componentRef.setInput('salonId', 4);
    fixture.componentRef.setInput('zoneId', 'Pacific/Tahiti');
    fixture.detectChanges();
    http.expectOne(PENDING).flush({
      years: pendingYears,
      oldest: pendingYears.length > 0 ? pendingYears[0] : null,
    });
    http.expectOne(`${ARCHIVES}?page=0&size=10`).flush({
      items: rows,
      totalItems: rows.length,
      page: 0,
      size: 10,
    });
    fixture.detectChanges();
    return fixture;
  }

  it('reads the archives through the platform chain, never the tenant one', () => {
    // La route tenant refuserait un jeton plateforme, et c'est tout l'objet de cet ecran :
    // atteindre les archives d'un client dont le compte est desactive.
    create();
  });

  /**
   * **« Non contrôlée » ne doit jamais se lire comme « intacte ».** Une archive antérieure au
   * contrôle d'intégrité ne dit rien du grand livre ; l'annoncer vérifiée affirmerait un contrôle
   * qui n'a pas eu lieu, sur la pièce même qu'on produirait devant l'administration.
   */
  it('never claims an unchecked archive was intact', () => {
    const fixture = create([archive({ integrityVerified: null, integrityAnomalies: null })]);
    const composant = fixture.componentInstance;

    const ligne = composant.archives()[0];
    expect(composant.integrityLabel(ligne)).toBe('Non contrôlée');
    expect(composant.integrityClass(ligne)).toBe('archives-unknown');
    expect(fixture.nativeElement.textContent).not.toContain('Intacte');
  });

  it('names the anomalies when the ledger was broken at sealing time', () => {
    const fixture = create([archive({ integrityVerified: false, integrityAnomalies: 3 })]);
    const ligne = fixture.componentInstance.archives()[0];

    expect(fixture.componentInstance.integrityLabel(ligne)).toBe('3 anomalies');
    expect(fixture.componentInstance.integrityClass(ligne)).toBe('archives-broken');
  });

  /**
   * **Une liste vide et « jamais scellé » ne veulent pas dire la même chose.** La première se lit
   * comme une panne ; la seconde est un fait à corriger chez le client — et c'est la première
   * question devant un contrôle.
   */
  it('says which closed years were never sealed', () => {
    const fixture = create([], [2023, 2024]);

    expect(fixture.nativeElement.textContent).toContain('2023, 2024');
    expect(fixture.nativeElement.textContent).toContain("Ce salon n'a scellé aucun exercice.");
  });

  it('says nothing about pending years when everything was sealed', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).not.toContain('jamais été scellé');
  });

  /**
   * **La date est celle du salon, pas celle de l'opérateur.** Vingt et une heures séparent Nouméa
   * de Papeete : ce n'est pas un décalage d'horaire, c'est un décalage de **jour**. Le scellement
   * du 4 janvier à 20:15 UTC tombe le 4 à Tahiti et le 5 à Nouméa — l'écran affiche donc le 4.
   */
  it('dates the sealing in the salon zone, not the browser one', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('04/01/2026');
  });

  /** Une taille brute ne se juge pas : « 3,2 Mo » se lit, « 3355443 » se compte. */
  it('shows the file size in readable units', () => {
    const fixture = create();

    expect(fixture.componentInstance.fileSize(3355443)).toBe('3.2 Mo');
    expect(fixture.componentInstance.fileSize(512)).toBe('512 o');
  });

  /**
   * **L'écran ne propose aucun scellement, et ce n'est pas un oubli.** Sceller un exercice est un
   * acte du contribuable, daté et attribué à une personne du salon ; le faire depuis le support
   * fabriquerait une pièce fiscale que personne chez le client n'a établie. Ce test est ce qui
   * empêche le bouton de réapparaître « pour rendre service ».
   */
  it('offers no way to seal an exercise from the support screen', () => {
    const fixture = create([], [2024]);
    const boutons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );

    expect(boutons.map((bouton) => bouton.textContent?.trim() ?? '')).not.toContain('Sceller');
    expect(fixture.nativeElement.textContent).toContain('acte du salon');
  });

  /**
   * **Une archive qui ne correspond plus à son sceau n'est pas remise.** C'est le cœur du sujet :
   * remettre à un contrôleur un fichier qui a dérivé serait pire que ne rien remettre — il
   * porterait l'apparence de la preuve sans en avoir la valeur. L'empreinte est un SHA-256 du
   * contenu, donc recalculable ici.
   */
  it('refuses to hand over a file that no longer matches its seal', async () => {
    const fixture = create();

    fixture.componentInstance.download(archive({ contentHash: 'f'.repeat(64) }));
    http.expectOne(`${ARCHIVES}/7/content`).flush(new Blob(['contenu falsifie']));
    await vi.waitUntil(() => fixture.componentInstance.downloadError() !== null);

    expect(fixture.componentInstance.downloadError()).toContain('ne correspond pas à son empreinte');
    expect(fixture.componentInstance.downloading()).toBeNull();
  });

  /** Le témoin : sans lui, un contrôle qui refuserait *tout* fichier passerait pour un contrôle. */
  it('hands over a file whose hash matches the seal', async () => {
    const contenu = 'contenu authentique';
    const empreinte = await sha256Hex(contenu);
    const fixture = create();

    fixture.componentInstance.download(archive({ contentHash: empreinte }));
    http.expectOne(`${ARCHIVES}/7/content`).flush(new Blob([contenu]));
    await vi.waitUntil(() => fixture.componentInstance.downloading() === null);

    expect(fixture.componentInstance.downloadError()).toBeNull();
  });
});

async function sha256Hex(texte: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(digest))
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('');
}
