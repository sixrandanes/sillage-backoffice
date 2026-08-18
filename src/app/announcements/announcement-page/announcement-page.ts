import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AnnouncementLevel, AnnouncementView } from '../models';
import { AnnouncementService } from '../announcement.service';

/**
 * Ce que la plateforme dit à ses clients.
 *
 * <p><b>Le manque comblé</b> : il n'existait aucun moyen de dire quoi que ce soit à l'ensemble des
 * salons. Une maintenance programmée, une nouveauté, un changement de tarif partaient par email —
 * c'est-à-dire nulle part, l'exploitante lisant ses messages le soir et pas devant sa caisse. Le
 * seul autre chemin était de déployer une version.
 *
 * <p><b>Le fuseau est celui de ce poste, et l'écran doit le dire.</b> On saisit « samedi 20 h » en
 * pensant à l'heure qu'il est ici ; le message s'affichera au **même instant** partout, donc à une
 * heure locale différente à Papeete. C'est le comportement correct — un instant est un instant —
 * mais il surprend si on ne l'annonce pas, et vingt et une heures séparent les deux territoires.
 */
@Component({
  selector: 'app-announcement-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './announcement-page.html',
  styleUrl: './announcement-page.scss',
})
export class AnnouncementPage {
  private readonly announcementService = inject(AnnouncementService);
  private readonly formBuilder = inject(FormBuilder);

  /** Le même plafond que le serveur : le compteur doit dire la vérité avant l'envoi. */
  readonly maxMessageLength = 500;

  readonly levels: readonly { value: AnnouncementLevel; label: string; hint: string }[] = [
    { value: 'INFO', label: 'Information', hint: 'Une nouveauté, une information de service.' },
    {
      value: 'WARNING',
      label: 'Avertissement',
      hint: "Ce qui demande de s'organiser : une maintenance, une échéance qui approche.",
    },
    { value: 'CRITICAL', label: 'Incident', hint: 'Ce qui empêche de travailler, ou va le faire.' },
  ];

  readonly announcements = signal<AnnouncementView[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal<string | null>(null);

  /**
   * La suppression demande une confirmation, **en deux temps sur la ligne** plutôt qu'en fenêtre
   * modale.
   *
   * <p>Ce n'est pas un détail de confort : retirer un message en cours le fait disparaître de
   * l'écran de **tous** les clients, et un clic de trop sur « Supprimer » ne se rattrape pas — il
   * n'existe pas de modification, donc pas d'annulation non plus. Le backoffice n'ouvre aucune
   * fenêtre modale ailleurs ; en introduire une ici pour un seul geste serait un dispositif de plus
   * à maintenir.
   */
  readonly pendingDeletion = signal<number | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(this.maxMessageLength)]],
    level: ['INFO' as AnnouncementLevel, Validators.required],
    startsAt: ['', Validators.required],
    endsAt: ['', Validators.required],
  });

  /**
   * Ce qui reste à écrire : un bandeau tronqué serait pire qu'un bandeau court.
   *
   * <p>Passe par `toSignal` et non par `form.value` : **`computed()` ne suit que des signaux**, et
   * lire la valeur du contrôle directement donne un calcul qui **ne se réévalue jamais** — le
   * compteur serait resté figé sur 500 quoi qu'on tape. C'est le piège déjà payé par
   * `offer-page`, et il ne se voit pas en relisant le code. Trouvé par un test.
   */
  private readonly messageValue = toSignal(this.form.controls.message.valueChanges, {
    initialValue: this.form.controls.message.value,
  });

  readonly remaining = computed(() => this.maxMessageLength - this.messageValue().length);

  /** Ce que les salons voient en ce moment — la seule ligne qui compte quand on ouvre cet écran. */
  readonly active = computed(() => this.announcements().filter((a) => a.status === 'ACTIVE'));

  constructor() {
    this.load();
    this.prefillWindow();
  }

  /** Le nom du fuseau de ce poste, pour que « 20 h » ne reste pas ambigu à l'écran. */
  readonly zoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone;

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();

    // **La fin avant le début est refusée ici aussi**, alors que le serveur la refuse déjà : lui
    // laisser le dernier mot ferait faire un aller-retour pour une faute qui se voit à l'écran.
    // Le serveur reste seul juge — c'est lui qui porte la règle, celle-ci n'est qu'une politesse.
    if (raw.endsAt <= raw.startsAt) {
      this.error.set("La fin de l'affichage doit venir après son début.");
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    this.done.set(null);
    this.announcementService
      .create({
        message: raw.message.trim(),
        level: raw.level,
        // `datetime-local` rend une heure **locale sans fuseau** : c'est `new Date` qui
        // l'interprète dans celui de ce poste, puis `toISOString` qui en fait un instant. Envoyer
        // la chaîne telle quelle ferait lire au serveur une heure UTC — soit onze heures d'écart
        // depuis Nouméa, et un message qui s'afficherait le lendemain.
        startsAt: new Date(raw.startsAt).toISOString(),
        endsAt: new Date(raw.endsAt).toISOString(),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.done.set('Message enregistré.');
          this.form.reset({ message: '', level: 'INFO', startsAt: '', endsAt: '' });
          this.prefillWindow();
          this.load();
        },
        error: (err: { error?: { message?: string } }) => {
          this.busy.set(false);
          this.error.set(err.error?.message ?? "Ce message n'a pas pu être enregistré.");
        },
      });
  }

  askDeletion(announcement: AnnouncementView): void {
    this.error.set(null);
    this.done.set(null);
    this.pendingDeletion.set(announcement.id);
  }

  cancelDeletion(): void {
    this.pendingDeletion.set(null);
  }

  confirmDeletion(announcement: AnnouncementView): void {
    this.busy.set(true);
    this.error.set(null);
    this.announcementService.delete(announcement.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.pendingDeletion.set(null);
        this.done.set('Message retiré.');
        this.load();
      },
      error: (err: { error?: { message?: string } }) => {
        this.busy.set(false);
        this.pendingDeletion.set(null);
        this.error.set(err.error?.message ?? "Ce message n'a pas pu être retiré.");
      },
    });
  }

  /** Date et heure locales de ce poste : c'est de là qu'on écrit, et c'est cette heure qu'on pense. */
  localWindow(announcement: AnnouncementView): string {
    return `${this.formatLocal(announcement.startsAt)} → ${this.formatLocal(announcement.endsAt)}`;
  }

  private formatLocal(instant: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(instant));
  }

  /**
   * Une fenêtre par défaut : de maintenant à dans une semaine.
   *
   * <p>Deux champs vides obligeraient à saisir deux dates complètes pour le geste le plus courant —
   * « affiche ça tout de suite ». La valeur reste modifiable, elle n'engage rien.
   */
  private prefillWindow(): void {
    const now = new Date();
    const inAWeek = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    this.form.patchValue({
      startsAt: this.asLocalInput(now),
      endsAt: this.asLocalInput(inAWeek),
    });
  }

  /**
   * Le format qu'attend `datetime-local` : `AAAA-MM-JJTHH:MM`, **en heure locale**.
   *
   * <p>`toISOString()` donnerait de l'UTC, donc onze heures de moins depuis Nouméa : le champ
   * s'ouvrirait sur la veille au soir. On compose donc la chaîne à partir des accesseurs locaux.
   */
  private asLocalInput(date: Date): string {
    const pad = (n: number) => `${n}`.padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }

  private load(): void {
    this.loading.set(true);
    this.announcementService.list().subscribe({
      next: (announcements) => {
        this.announcements.set(announcements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les messages.');
        this.loading.set(false);
      },
    });
  }
}
