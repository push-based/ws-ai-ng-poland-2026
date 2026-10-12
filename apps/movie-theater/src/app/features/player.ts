import {
  Component,
  inject,
  viewChild,
  ElementRef,
  afterNextRender,
  signal,
  linkedSignal,
} from '@angular/core';
import {
  LucidePlay,
  LucidePause,
  LucideMaximize,
  LucideScanEye,
  LucideCaptions,
} from '@lucide/angular';
import { CinemaService } from '../core/cinema.service';
@Component({
  selector: 'app-cinema-player',
  imports: [
    LucidePlay,
    LucidePause,
    LucideMaximize,
    LucideScanEye,
    LucideCaptions,
  ],
  template: `
    <section class="player-area">
      <div class="screen" #screen>
        <video
          #video
          [src]="'media/' + cinema.movieId() + '.mp4'"
          [poster]="'media/' + cinema.movieId() + '.jpg'"
          preload="metadata"
          playsinline
          (timeupdate)="updateTime()"
          (loadedmetadata)="loaded()"
          (play)="cinema.playing.set(true)"
          (pause)="cinema.playing.set(false)"
          (ended)="cinema.playing.set(false)"
          (error)="
            mediaError.set(
              'The local clip could not be loaded. Check the bundled media files.'
            )
          "
        ></video>
        @if (!cinema.playing()) {
          <button
            class="screen-play"
            (click)="toggle()"
            aria-label="Play excerpt"
          >
            <svg lucidePlay></svg>
          </button>
        }
        @if (cinema.captionsVisible() && cinema.caption()) {
          <div class="subtitle">
            <span>{{ cinema.caption() }}</span>
          </div>
        }
        <span class="screen-label">30 SECOND SCREENING</span>
      </div>
      <div class="transport">
        <button
          (click)="toggle()"
          [attr.aria-label]="cinema.playing() ? 'Pause' : 'Play'"
        >
          @if (cinema.playing()) {
            <svg lucidePause></svg>
          } @else {
            <svg lucidePlay></svg>
          }</button
        ><span class="time">{{ time(cinema.time()) }}</span
        ><input
          type="range"
          min="0"
          [max]="cinema.duration()"
          step="0.1"
          [value]="cinema.time()"
          (input)="seek($event)"
          aria-label="Playback position"
        /><span class="time">{{ time(cinema.duration()) }}</span
        ><button
          (click)="cinema.captionsVisible.update(invert)"
          [attr.aria-pressed]="cinema.captionsVisible()"
          aria-label="Toggle commentary captions"
        >
          <svg lucideCaptions></svg></button
        ><button (click)="fullscreen()" aria-label="Fullscreen">
          <svg lucideMaximize></svg>
        </button>
      </div>
      @if (mediaError()) {
        <p class="error" role="alert">{{ mediaError() }}</p>
      }
      <div class="player-meta">
        <div>
          <span class="eyebrow">NOW SCREENING · {{ cinema.movie().year }}</span>
          <h2>{{ cinema.movie().title }}</h2>
          <p>{{ cinema.movie().genre }} / {{ cinema.movie().director }}</p>
        </div>
        <button
          class="button secondary"
          (click)="capture()"
          [disabled]="cinema.ai.busy()"
        >
          <svg lucideScanEye></svg> Describe this shot
        </button>
      </div>
      <div class="caption-settings">
        <div>
          <span class="api-chip">Translator API</span>
          <p class="micro">Authored commentary captions · timings preserved</p>
        </div>
        <label
          >Caption language
          <select
            [value]="cinema.subtitleLanguage()"
            (change)="translate($event)"
            [disabled]="cinema.ai.busy()"
          >
            <option value="en">English</option>
            <option value="pl">Polski</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select></label
        >
      </div>
      <details class="caption-comparison">
        <summary>Compare commentary captions</summary>
        @for (cue of cinema.movie().captions; track cue.start) {
          <div class="cue">
            <span>{{ time(cue.start) }}–{{ time(cue.end) }}</span>
            <p>{{ cue.text }}</p>
            @if (cinema.subtitleLanguage() !== 'en') {
              <p class="translated" [attr.lang]="cinema.subtitleLanguage()">
                {{ cinema.captionTexts()[$index] }}
              </p>
            }
          </div>
        }
      </details>
      @if (shot()) {
        <div class="shot panel">
          <img
            [src]="shot()"
            alt="Captured frame sent to the scene-description model"
          />
          <div>
            <span class="api-chip">Prompt API · Image input</span>
            <p aria-live="polite">
              {{ description() || 'Describing the captured frame…' }}
            </p>
          </div>
        </div>
      }
      <p class="credits">
        {{ cinema.movie().credit }} · {{ cinema.movie().license }} · Edited
        excerpt and derived still.
        <a [href]="cinema.movie().source" target="_blank" rel="noopener"
          >Original project</a
        >
      </p>
    </section>
  `,
  styles: [
    `
      .screen {
        position: relative;
        aspect-ratio: 16/9;
        background: #000;
        border: 1px solid var(--line);
        border-radius: 16px 16px 0 0;
        overflow: hidden;
        box-shadow: 0 0 80px #d4a3570a;
      }
      .screen video {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .screen-play {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        border: 1px solid #ffffff50;
        background: #12141870;
        backdrop-filter: blur(8px);
        color: #fff;
        border-radius: 50%;
        width: 72px;
        height: 72px;
        display: grid;
        place-items: center;
      }
      .screen-play svg {
        width: 28px;
      }
      .screen-label {
        position: absolute;
        top: 20px;
        left: 22px;
        font-size: 9px;
        letter-spacing: 2px;
        color: #fff;
        background: #0009;
        padding: 7px 10px;
        border-radius: 4px;
      }
      .subtitle {
        position: absolute;
        bottom: 24px;
        left: 8%;
        right: 8%;
        text-align: center;
        pointer-events: none;
      }
      .subtitle span {
        background: #000d;
        padding: 6px 12px;
        box-decoration-break: clone;
        line-height: 1.8;
        font-size: clamp(12px, 1.4vw, 19px);
        color: white;
      }
      .transport {
        display: flex;
        gap: 14px;
        align-items: center;
        background: #1a1d20;
        border: 1px solid var(--line);
        border-top: 0;
        padding: 14px 20px;
        border-radius: 0 0 12px 12px;
      }
      .transport button {
        background: none;
        border: none;
        color: var(--text);
        display: grid;
        place-items: center;
      }
      .transport svg {
        width: 18px;
        height: 18px;
      }
      .transport input {
        flex: 1;
        min-width: 30px;
        accent-color: var(--amber);
      }
      .time {
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        color: var(--muted);
      }
      .player-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin: 25px 0;
      }
      .player-meta h2 {
        font-family: var(--display);
        font-size: 36px;
        margin: 8px 0;
      }
      .player-meta p {
        color: var(--muted);
        font-size: 13px;
        margin: 0;
      }
      .caption-settings {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 0;
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        gap: 12px;
      }
      .caption-settings label {
        color: var(--muted);
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .shot {
        display: grid;
        grid-template-columns: 200px 1fr;
        margin-top: 22px;
        overflow: hidden;
      }
      .shot img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .shot > div {
        padding: 18px;
      }
      .shot p {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.6;
      }
      .caption-comparison {
        margin-top: 18px;
        font-size: 12px;
        color: var(--muted);
      }
      .caption-comparison summary {
        cursor: pointer;
      }
      .cue {
        border-bottom: 1px solid var(--line);
        padding: 12px 0;
      }
      .cue span {
        font-size: 10px;
        color: var(--amber);
      }
      .cue p {
        line-height: 1.6;
        margin: 6px 0;
      }
      .cue .translated {
        color: var(--text);
      }
      .credits {
        font-size: 10px;
        color: var(--muted);
        line-height: 1.6;
        margin-top: 20px;
      }
      .credits a {
        color: var(--muted);
      }
      @media (max-width: 650px) {
        .player-meta,
        .caption-settings {
          align-items: flex-start;
          flex-direction: column;
        }
        .shot {
          grid-template-columns: 1fr;
        }
        .shot img {
          max-height: 180px;
        }
        .transport {
          gap: 8px;
          padding: 12px;
        }
      }
    `,
  ],
})
export class Player {
  readonly cinema = inject(CinemaService);
  readonly mediaError = signal('');
  readonly shot = linkedSignal({
    source: () => [
      this.cinema.movieId(),
      this.cinema.ai.mode(),
      this.cinema.resetRevision(),
    ],
    computation: () => '',
  });
  readonly description = signal('');
  readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  readonly screen = viewChild.required<ElementRef<HTMLElement>>('screen');
  readonly invert = (value: boolean) => !value;
  constructor() {
    afterNextRender(() => {
      this.cinema.video = this.video().nativeElement;
    });
  }
  updateTime() {
    this.cinema.time.set(this.video().nativeElement.currentTime);
  }
  loaded() {
    const video = this.video().nativeElement;
    this.cinema.duration.set(
      Number.isFinite(video.duration) ? video.duration : 30,
    );
    this.cinema.time.set(0);
    this.mediaError.set('');
    this.shot.set('');
  }
  time(value: number) {
    return `0:${Math.floor(value).toString().padStart(2, '0')}`;
  }
  async toggle() {
    try {
      if (this.cinema.playing()) this.cinema.pause();
      else await this.cinema.play();
    } catch (error) {
      this.mediaError.set(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  seek(event: Event) {
    this.cinema.seek(Number((event.target as HTMLInputElement).value));
  }
  async translate(event: Event) {
    const select = event.target as HTMLSelectElement;
    try {
      await this.cinema.subtitles(select.value);
    } catch {
      select.value = this.cinema.subtitleLanguage();
    }
  }
  async fullscreen() {
    try {
      await this.screen().nativeElement.requestFullscreen();
    } catch {
      this.mediaError.set('Fullscreen is unavailable in this browser surface.');
    }
  }
  async capture() {
    const video = this.video().nativeElement;
    if (!video.videoWidth) {
      this.mediaError.set('Load or play the clip before capturing a frame.');
      return;
    }
    this.cinema.pause();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    this.shot.set(canvas.toDataURL('image/jpeg'));
    this.description.set('');
    try {
      this.description.set(await this.cinema.ai.describe(canvas));
    } catch {
      this.description.set(this.cinema.ai.error());
    }
  }
}
