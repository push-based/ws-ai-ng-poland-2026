import {
  Component,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { movies } from '@nano-cinema/catalogue';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import { checkImageSupport, defaultQuestion, describeImage } from './exercise';

/** Longest side of the picture we send. Smaller images are faster to process. */
const maxSide = 1024;

/** Ready-made UI for exercise 2.5. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-multimodal',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabMultimodal implements OnDestroy {
  readonly log = new LabLog();
  readonly movies = movies;
  readonly movieId = signal(movies[0].id);
  readonly videoError = signal(false);
  readonly textSupport = signal<Availability | 'missing' | undefined>(
    undefined,
  );
  readonly imageSupport = signal<Availability | 'missing' | undefined>(
    undefined,
  );
  readonly imageLabel = signal('');
  readonly question = signal(defaultQuestion);
  readonly answer = signal('');
  readonly working = signal(false);
  private readonly video =
    viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly frame =
    viewChild.required<ElementRef<HTMLCanvasElement>>('frame');
  private controller?: AbortController;

  /** Steps 1–2: compare text-only availability with text + image availability. */
  async checkSupport() {
    try {
      this.textSupport.set(
        typeof LanguageModel === 'undefined'
          ? 'missing'
          : await LanguageModel.availability({
              expectedInputs: [{ type: 'text', languages: ['en'] }],
              expectedOutputs: [{ type: 'text', languages: ['en'] }],
            }),
      );
    } catch (error) {
      this.log.add(
        'error',
        `Text-only availability check failed: ${String(error)}`,
      );
    }
    this.imageSupport.set(
      await this.log.run('checkImageSupport()', () => checkImageSupport()),
    );
  }

  selectMovie(event: Event) {
    this.movieId.set((event.target as HTMLSelectElement).value);
    this.videoError.set(false);
  }

  /** Pause the clip and copy the current video pixels into the preview canvas. */
  captureFrame() {
    const video = this.video().nativeElement;
    if (this.videoError() || !video.videoWidth) {
      this.log.add(
        'error',
        'No video frame yet. Play the clip for a moment (or use your own picture), then capture.',
      );
      return;
    }
    video.pause();
    const title = movies.find((movie) => movie.id === this.movieId())?.title;
    this.draw(
      video,
      video.videoWidth,
      video.videoHeight,
      `Frame at ${video.currentTime.toFixed(1)} s of ${title}`,
    );
  }

  /** Any picture from your computer works too. createImageBitmap() decodes it. */
  async useFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      this.draw(bitmap, bitmap.width, bitmap.height, file.name);
      bitmap.close();
    } catch {
      this.log.add(
        'error',
        `${file.name} is not an image this browser can decode.`,
      );
    }
  }

  /** Steps 3–4: send the preview canvas, exactly what you see, to the model. */
  async describe() {
    const question = this.question().trim();
    if (!this.imageLabel() || !question || this.log.busy()) return;
    const controller = new AbortController();
    this.controller = controller;
    this.answer.set('');
    this.working.set(true);
    const answer = await this.log.run('describeImage()', () =>
      describeImage(this.frame().nativeElement, question, controller.signal),
    );
    this.working.set(false);
    if (answer !== undefined) this.answer.set(answer);
    if (this.controller === controller) this.controller = undefined;
  }

  stop() {
    this.controller?.abort();
  }

  setQuestion(event: Event) {
    this.question.set((event.target as HTMLInputElement).value);
  }

  private draw(
    source: CanvasImageSource,
    width: number,
    height: number,
    label: string,
  ) {
    const canvas = this.frame().nativeElement;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas
      .getContext('2d')
      ?.drawImage(source, 0, 0, canvas.width, canvas.height);
    this.imageLabel.set(`${label} · ${canvas.width}×${canvas.height} px`);
    this.answer.set('');
  }

  ngOnDestroy() {
    // describeImage() destroys its own session in finally; stopping is enough.
    this.controller?.abort();
  }
}
