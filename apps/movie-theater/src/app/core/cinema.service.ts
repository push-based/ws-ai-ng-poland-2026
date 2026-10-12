import { Injectable, signal, computed, inject } from '@angular/core';
import { movies, getMovie } from '@nano-cinema/catalogue';
import { AudioService } from './audio.service';
import { AiService } from './ai.service';
@Injectable({ providedIn: 'root' })
export class CinemaService {
  readonly movieId = signal('sintel');
  readonly resetRevision = signal(0);
  readonly movie = computed(() => getMovie(this.movieId()));
  readonly view = signal<'discover' | 'screening' | 'booth'>('discover');
  readonly time = signal(0);
  readonly duration = signal(30);
  readonly playing = signal(false);
  readonly subtitleLanguage = signal('en');
  readonly captionTexts = signal<string[]>(
    getMovie('sintel').captions.map((c) => c.text),
  );
  readonly caption = computed(() => {
    const index = this.movie().captions.findIndex(
      (c) => this.time() >= c.start && this.time() < c.end,
    );
    return this.captionTexts()[index] ?? '';
  });
  readonly captionsVisible = signal(true);
  readonly audio = inject(AudioService);
  readonly ai = inject(AiService);
  readonly catalogue = movies;
  video?: HTMLVideoElement;
  select(id: string) {
    getMovie(id);
    if (this.ai.busy())
      throw new Error(
        'Wait for the current AI operation before changing movies.',
      );
    this.video?.pause();
    if (this.video && this.video.readyState >= 1) this.video.currentTime = 0;
    this.movieId.set(id);
    this.time.set(0);
    this.subtitleLanguage.set('en');
    this.captionTexts.set(this.movie().captions.map((c) => c.text));
  }
  async play() {
    if (!this.video) throw new Error('Player is not attached.');
    await this.audio.connect(this.video);
    await this.video.play();
  }
  pause() {
    this.video?.pause();
  }
  seek(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > this.duration())
      throw new Error('Seek position is outside this excerpt.');
    if (!this.video) throw new Error('Player is not attached.');
    this.video.currentTime = seconds;
    this.time.set(seconds);
  }
  async subtitles(language: string) {
    if (!['en', 'pl', 'de', 'es', 'fr'].includes(language))
      throw new Error('Unsupported subtitle language.');
    const movie = this.movie();
    const captions = await this.ai.captions(movie, language);
    if (this.movieId() !== movie.id)
      throw new Error('Movie changed during translation.');
    this.captionTexts.set(captions);
    this.subtitleLanguage.set(language);
  }
  state() {
    return {
      movieId: this.movieId(),
      title: this.movie().title,
      position: this.time(),
      duration: this.duration(),
      playing: this.playing(),
      subtitleLanguage: this.subtitleLanguage(),
      audioMix: this.audio.mix(),
      audioUnlocked: this.audio.active(),
    };
  }
  reset() {
    this.resetRevision.update((value) => value + 1);
    this.ai.reset();
    this.pause();
    if (this.video && this.video.readyState >= 1) this.video.currentTime = 0;
    this.movieId.set('sintel');
    this.view.set('discover');
    this.time.set(0);
    this.subtitleLanguage.set('en');
    this.captionTexts.set(this.movie().captions.map((c) => c.text));
    this.audio.preset('flat');
  }
}
