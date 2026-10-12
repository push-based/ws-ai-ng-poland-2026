import {
  Component,
  inject,
  signal,
  computed,
  afterNextRender,
  Injector,
  viewChild,
  ElementRef,
} from '@angular/core';
import {
  LucideFilm,
  LucideArrowUpRight,
  LucidePlay,
  LucideCpu,
  LucideSlidersHorizontal,
  LucideSparkles,
  LucideArrowLeft,
  LucideRotateCcw,
} from '@lucide/angular';
import { searchMovies } from '@nano-cinema/catalogue';
import { CinemaService } from './core/cinema.service';
import { ToolsService } from './core/tools.service';
import { Concierge } from './features/concierge';
import { Player } from './features/player';
import { Notes } from './features/notes';
import { Booth } from './features/booth';
import { Lens } from './features/lens';
import { Writing } from './features/writing';
@Component({
  selector: 'app-root',
  imports: [
    LucideFilm,
    LucideArrowUpRight,
    LucidePlay,
    LucideCpu,
    LucideSlidersHorizontal,
    LucideSparkles,
    LucideArrowLeft,
    LucideRotateCcw,
    Concierge,
    Player,
    Notes,
    Booth,
    Lens,
    Writing,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly cinema = inject(CinemaService);
  readonly ai = this.cinema.ai;
  readonly tools = inject(ToolsService);
  readonly lens = signal(false);
  private readonly injector = inject(Injector);
  readonly lensButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('lensButton');
  closeLens() {
    this.lens.set(false);
    afterNextRender(() => this.lensButton().nativeElement.focus(), {
      injector: this.injector,
    });
  }
  readonly model = signal({ query: '', language: '' });
  readonly query = signal('');
  readonly language = signal('');
  readonly films = computed(() => searchMovies(this.query(), this.language()));
  readonly viewLabels = {
    discover: 'Discover',
    screening: 'Screening room',
    booth: 'Projection booth',
  };
  constructor() {
    afterNextRender(() => {
      void this.ai.check();
      void this.tools.register();
    });
  }
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
  search(event: Event) {
    event.preventDefault();
    this.query.set(this.model().query);
    this.language.set(this.model().language);
    this.ai.trace(
      'WebMCP',
      'declarative search form',
      JSON.stringify(this.model()),
    );
  }
  watch(id: string) {
    if (this.ai.busy()) return;
    this.cinema.select(id);
    this.cinema.view.set('screening');
  }
  reset() {
    this.cinema.reset();
    this.tools.log.set([]);
    this.ai.traces.set([]);
    this.model.set({ query: '', language: '' });
    this.query.set('');
    this.language.set('');
  }
  switchMode(event: Event) {
    this.ai.setMode(
      (event.target as HTMLSelectElement).value as 'native' | 'fixture',
    );
  }
}
