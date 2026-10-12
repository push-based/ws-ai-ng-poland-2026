import { Component, computed, inject, linkedSignal } from '@angular/core';
import {
  LucidePlay,
  LucideArrowUpRight,
  LucideFilm,
  LucideSparkles,
  LucideSlidersHorizontal,
} from '@lucide/angular';
import { searchMovies } from '@nano-cinema/catalogue';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { CinemaService } from '../../core/cinema.service';
import { Concierge } from '../concierge/concierge';
import { Router } from '@angular/router';
import { InspectorState } from '../../core/inspector-state.service';

/** Catalogue search and discovery UI. The application shell owns navigation and the inspector. */
@Component({
  selector: 'app-cinema-discover',
  imports: [
    Concierge,
    LucidePlay,
    LucideArrowUpRight,
    LucideFilm,
    LucideSparkles,
    LucideSlidersHorizontal,
  ],
  templateUrl: './discover.html',
  styleUrl: './discover.css',
})
export class Discover {
  readonly cinema = inject(CinemaService);
  readonly runtime = inject(AiRuntime);
  readonly inspector = inject(InspectorState);
  private readonly router = inject(Router);
  readonly model = linkedSignal({
    source: () => this.cinema.resetRevision(),
    computation: () => ({ query: '', language: '' }),
  });
  private readonly filters = linkedSignal({
    source: () => this.cinema.resetRevision(),
    computation: () => ({ query: '', language: '' }),
  });
  readonly films = computed(() =>
    searchMovies(this.filters().query, this.filters().language),
  );

  setQuery(event: Event) {
    this.model.update((value) => ({
      ...value,
      query: (event.target as HTMLInputElement).value,
    }));
  }

  setLanguage(event: Event) {
    this.model.update((value) => ({
      ...value,
      language: (event.target as HTMLSelectElement).value,
    }));
  }

  /** The same native HTML form remains useful without WebMCP support. */
  search(event: Event) {
    event.preventDefault();
    this.filters.set(this.model());
    this.runtime.trace(
      'WebMCP',
      'declarative search form',
      JSON.stringify(this.model()),
    );
  }

  watch(id: string) {
    if (this.runtime.busy()) return;
    void this.router.navigate(['/movies', id]);
  }
}
