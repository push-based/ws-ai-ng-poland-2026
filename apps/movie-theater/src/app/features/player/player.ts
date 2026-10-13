import {
  Component,
  DestroyRef,
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
import { AiRuntime } from '../../ai/ai-runtime.service';
import { SceneDescriptionService } from './scene-description.service';
import { DetectionControls } from '../detection/detection-controls';
import { ObjectDetectionService } from '../detection/object-detection.service';
import { CinemaService } from '../../core/cinema.service';
@Component({
  selector: 'app-cinema-player',
  imports: [
    LucidePlay,
    LucidePause,
    LucideMaximize,
    LucideScanEye,
    LucideCaptions,
    DetectionControls,
  ],
  providers: [ObjectDetectionService],
  templateUrl: './player.html',
  styleUrl: './player.css',
})
export class Player {
  readonly cinema = inject(CinemaService);
  readonly detector = inject(ObjectDetectionService);
  readonly videoElement = signal<HTMLVideoElement | null>(null);

  score(value: number) {
    return Math.round(value * 100);
  }

  readonly runtime = inject(AiRuntime);
  private readonly scenes = inject(SceneDescriptionService);
  readonly mediaError = signal('');
  readonly shot = linkedSignal({
    source: () => [
      this.cinema.movieId(),
      this.runtime.mode(),
      this.cinema.resetRevision(),
    ],
    computation: () => '',
  });
  readonly description = signal('');
  readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  readonly screen = viewChild.required<ElementRef<HTMLElement>>('screen');
  readonly invert = (value: boolean) => !value;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cinema.detachVideo());
    afterNextRender(() => {
      this.cinema.video = this.video().nativeElement;
      this.videoElement.set(this.video().nativeElement);
    });
  }

  updateTime() {
    if (
      this.cinema.playing() &&
      !this.detector.tracking() &&
      this.detector.boxes().length
    )
      this.detector.clearBoxes();
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
    this.detector.clearBoxes();
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
    this.detector.clearBoxes();
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

  // Pause and copy the current video pixels into a canvas. Both the preview and
  // image-input Prompt call use that same captured frame, so participants can check
  // what the model was actually given. This is independent of ONNX object detection.
  async capture() {
    const video = this.video().nativeElement;
    if (!video.videoWidth) {
      this.mediaError.set('Load or play the clip before capturing a frame.');
      return;
    }
    this.cinema.pause();
    const canvas = document.createElement('canvas');
    // Use intrinsic video dimensions, not the CSS display size: the model should
    // receive the source pixels even when the visible player has been resized.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    this.shot.set(canvas.toDataURL('image/jpeg'));
    this.description.set('');
    try {
      this.description.set(await this.scenes.describe(canvas));
    } catch {
      this.description.set(this.runtime.error());
    }
  }
}
