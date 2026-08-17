import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '../core/api';
import { PageResponse } from '../core/http/page';
import { PendingArchives, SalonArchive } from './archive.models';

/**
 * Les archives fiscales d'un salon, en lecture seule.
 *
 * **Aucune route de scellement, et ce n'est pas un oubli** : sceller un exercice est un acte du
 * contribuable, daté et attribué à une personne du salon. Le faire depuis le support fabriquerait
 * une pièce fiscale que personne chez le client n'a établie.
 *
 * Le téléchargement est tracé côté serveur, **à chaque fois** — contrairement à la consultation du
 * journal de caisse, dédoublonnée par tranche de 24 h : feuilleter un journal demande une dizaine
 * de requêtes, emporter une archive est un geste unique et délibéré.
 */
@Injectable({ providedIn: 'root' })
export class SalonArchivesService {
  private readonly http = inject(HttpClient);

  private base(salonId: number): string {
    return `${API}/platform/salons/${salonId}/accounting/archives`;
  }

  archives(salonId: number, page = 0, size = 10): Observable<PageResponse<SalonArchive>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<SalonArchive>>(this.base(salonId), { params });
  }

  pending(salonId: number): Observable<PendingArchives> {
    return this.http.get<PendingArchives>(`${this.base(salonId)}/pending`);
  }

  /** Le fichier scellé, tel quel. Son empreinte est déjà sur la ligne qui l'a demandé. */
  download(salonId: number, archiveId: number): Observable<Blob> {
    return this.http.get(`${this.base(salonId)}/${archiveId}/content`, {
      responseType: 'blob',
    });
  }
}
