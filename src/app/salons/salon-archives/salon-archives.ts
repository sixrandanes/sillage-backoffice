import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { PendingArchives, SalonArchive } from '../archive.models';
import { formatInZone } from '../../core/zone';
import { SalonArchivesService } from '../salon-archives.service';

/**
 * Les archives fiscales d'un salon, vues depuis le support.
 *
 * **Ce que cet écran répare.** Une archive ne vivait que derrière la chaîne cliente, et le serveur
 * refuse tout jeton d'une organisation désactivée : le geste qui clôt un client — désactiver son
 * compte — **enfermait ses archives**, pour lui comme pour nous. Or l'article 286 I-3° bis du CGI
 * oblige à les produire pendant six ans. Le défaut ne se serait vu que le jour d'un contrôle,
 * c'est-à-dire trop tard.
 *
 * **Aucun scellement depuis ici.** Sceller est un acte du contribuable ; le support peut constater
 * qu'un exercice ne l'a jamais été, jamais le faire à sa place.
 */
@Component({
  selector: 'app-salon-archives',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './salon-archives.html',
  styleUrl: './salon-archives.scss',
})
export class SalonArchives {
  private readonly archivesService = inject(SalonArchivesService);

  readonly salonId = input.required<number>();

  /** Le fuseau du salon : une archive se date **chez lui**, pas chez l'opérateur. */
  readonly zoneId = input<string | null>(null);

  readonly archives = signal<SalonArchive[]>([]);
  readonly pending = signal<PendingArchives | null>(null);
  readonly totalItems = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly downloading = signal<number | null>(null);
  readonly downloadError = signal<string | null>(null);

  readonly page = signal(0);
  readonly pageSize = signal(10);

  readonly displayedColumns = ['businessYear', 'createdAt', 'volumes', 'integrity', 'hash', 'download'];

  constructor() {
    effect(() => {
      const salonId = this.salonId();
      untracked(() => {
        this.archivesService.pending(salonId).subscribe({
          next: (pending) => this.pending.set(pending),
          // Sans cette liste, seul l'avertissement disparaît : l'historique reste lisible.
          error: () => this.pending.set(null),
        });
      });
    });

    effect(() => {
      const salonId = this.salonId();
      const page = this.page();
      const size = this.pageSize();
      untracked(() => this.load(salonId, page, size));
    });
  }

  changePage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.page.set(event.pageIndex);
  }

  /** Une archive se date dans le fuseau du salon, jamais dans celui du navigateur. */
  protected when(createdAt: string): string {
    return formatInZone(createdAt, this.zoneId());
  }

  /**
   * L'empreinte, abrégée pour l'écran.
   *
   * Elle en fait 64 caractères : entière, elle chasserait toute la ligne. Les douze premiers
   * suffisent à recopier une référence dans un échange, et l'infobulle porte la complète.
   */
  shortHash(hash: string): string {
    return hash.slice(0, 12);
  }

  /** La taille du fichier, en unités lisibles : « 3,2 Mo » se juge, « 3355443 » non. */
  fileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} o`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} Ko`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  /**
   * Ce que dit le contrôle d'intégrité fait **au scellement**.
   *
   * `null` n'est pas « intact » : c'est une archive antérieure à ce contrôle. Les peindre pareil
   * affirmerait une vérification qui n'a jamais eu lieu — exactement le genre de phrase qu'on ne
   * peut pas se permettre sur une pièce fiscale.
   */
  integrityLabel(archive: SalonArchive): string {
    if (archive.integrityVerified === null) {
      return 'Non contrôlée';
    }
    if (archive.integrityVerified) {
      return 'Intacte au scellement';
    }
    const anomalies = archive.integrityAnomalies ?? 0;
    return `${anomalies} anomalie${anomalies > 1 ? 's' : ''}`;
  }

  integrityClass(archive: SalonArchive): string {
    if (archive.integrityVerified === null) {
      return 'archives-unknown';
    }
    return archive.integrityVerified ? 'archives-ok' : 'archives-broken';
  }

  /**
   * Télécharge le fichier scellé, **après avoir vérifié qu'il correspond à son sceau**.
   *
   * L'empreinte est un SHA-256 du contenu, calculé au scellement. Le navigateur peut donc le
   * recalculer : un fichier qui ne correspond plus n'est pas enregistré, et l'écran le dit.
   * Remettre à un client — ou à un contrôleur — une archive qui a dérivé serait pire que ne rien
   * remettre du tout : elle porterait l'apparence de la preuve sans en avoir la valeur.
   *
   * Le nom du fichier porte le salon et l'exercice : anonyme dans un dossier de téléchargements,
   * une archive ne prouve rien non plus.
   */
  download(archive: SalonArchive): void {
    this.downloading.set(archive.id);
    this.downloadError.set(null);
    this.archivesService.download(this.salonId(), archive.id).subscribe({
      next: async (blob) => {
        if (!(await this.matchesItsSeal(blob, archive.contentHash))) {
          this.downloadError.set(
            `L'archive ${archive.businessYear} téléchargée ne correspond pas à son empreinte scellée. ` +
              "Elle n'a pas été enregistrée : ne la remettez à personne en l'état.",
          );
          this.downloading.set(null);
          return;
        }
        const url = URL.createObjectURL(blob);
        const lien = document.createElement('a');
        lien.href = url;
        lien.download = `archive-fiscale-${this.salonId()}-${archive.businessYear}.json.gz`;
        lien.click();
        URL.revokeObjectURL(url);
        this.downloading.set(null);
      },
      error: () => {
        this.downloadError.set('Impossible de télécharger cette archive.');
        this.downloading.set(null);
      },
    });
  }

  /**
   * Le fichier reçu porte-t-il l'empreinte scellée ?
   *
   * `crypto.subtle` n'existe que sur une origine sûre. En son absence on rend `true` plutôt que de
   * bloquer : **ne pas pouvoir vérifier n'est pas la même chose que constater une altération**, et
   * refuser le fichier dans ce cas priverait le support du document pour une raison qui ne dit rien
   * de son intégrité. Le backoffice n'est servi qu'en HTTPS, donc ce repli ne s'observe pas.
   */
  private async matchesItsSeal(blob: Blob, sealed: string): Promise<boolean> {
    if (!globalThis.crypto?.subtle) {
      return true;
    }
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    const hex = Array.from(new Uint8Array(digest))
      .map((octet) => octet.toString(16).padStart(2, '0'))
      .join('');
    return hex === sealed;
  }

  private load(salonId: number, page: number, size: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.archivesService.archives(salonId, page, size).subscribe({
      next: (result) => {
        this.archives.set(result.items);
        this.totalItems.set(result.totalItems);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les archives de ce salon.');
        this.loading.set(false);
      },
    });
  }
}
