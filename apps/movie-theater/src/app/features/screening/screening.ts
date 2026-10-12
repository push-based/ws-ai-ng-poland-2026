import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { movies } from '@nano-cinema/catalogue';
import { CinemaService } from '../../core/cinema.service';
import { Player } from '../player/player';
import { Notes } from '../notes/notes';
import { Comments } from '../comments/comments';
import { Booth } from '../booth/booth';

type ScreeningPanel = 'story' | 'comments' | 'sound';
function parsePanel(value: string | undefined): ScreeningPanel {
  return value === 'comments' || value === 'sound' ? value : 'story';
}

/** Route inputs provide the film and sidebar selection; URLs survive refresh, linking and Back navigation. */
@Component({
  selector: 'app-screening-room',
  imports: [RouterLink, LucideArrowLeft, Player, Notes, Comments, Booth],
  templateUrl: './screening.html',
  styleUrl: './screening.css',
})
export class Screening {
  readonly id = input.required<string>();
  readonly panel = input<ScreeningPanel, string | undefined>('story', {
    transform: parsePanel,
  });
  readonly movie = computed(() =>
    movies.find((movie) => movie.id === this.id()),
  );
  readonly tabs = [
    { id: 'story', label: 'Story' },
    { id: 'comments', label: 'Comments' },
    { id: 'sound', label: 'Sound' },
  ] as const;
  private readonly cinema = inject(CinemaService);
  private readonly router = inject(Router);

  constructor() {
    // The URL owns this feature's lifetime; leaving a movie cancels its pending AI work.
    inject(DestroyRef).onDestroy(() => this.cinema.runtime.reset());
    effect(() => {
      const id = this.id();
      untracked(() => {
        if (
          movies.some((movie) => movie.id === id) &&
          this.cinema.movieId() !== id
        ) {
          // Browser navigation can interrupt an AI task. Abort it before switching its source movie.
          this.cinema.runtime.reset();
          this.cinema.select(id);
        }
      });
    });
  }

  selectPanel(panel: ScreeningPanel) {
    void this.router.navigate(['/movies', this.id()], {
      queryParams: panel === 'story' ? {} : { panel },
    });
  }
}
