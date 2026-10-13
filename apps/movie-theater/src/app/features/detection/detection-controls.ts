import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { ObjectDetectionService } from './object-detection.service';

/** Optional controls: inference lives in a worker, and live tracking has its own explicit opt-in. */
@Component({
  selector: 'app-detection-controls',
  templateUrl: './detection-controls.html',
  styleUrl: './detection-controls.css',
})
export class DetectionControls {
  readonly video = input<HTMLVideoElement | null>(null);
  readonly detector = inject(ObjectDetectionService);
  // A lower score threshold shows more predictions (including weak guesses);
  // a higher value hides more uncertain ones. It does not change the model or
  // prove that the remaining detections are correct.
  readonly threshold = signal(0.35);
  readonly peopleOnly = signal(true);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTracking());
  }

  async toggle() {
    if (this.detector.enabled()) {
      this.stopTracking();
      this.detector.disable();
    } else await this.detector.enable();
  }

  // Manual mode pauses the video so a single result stays aligned with the
  // frame being inspected. Enabling the model does not opt into continuous scanning.
  async scanFrame() {
    const video = this.video();
    if (!video) return;
    video.pause();
    await this.detector.scan(video, this.threshold(), this.peopleOnly());
  }

  setThreshold(event: Event) {
    this.threshold.set(Number((event.target as HTMLInputElement).value));
  }

  setPeople(event: Event) {
    this.peopleOnly.set((event.target as HTMLInputElement).checked);
    this.detector.clearBoxes();
  }

  // Live inference is a separate choice and is offered only for the WebGPU
  // backend. WASM remains useful for a manual scan without starting a CPU-heavy loop.
  setTracking(event: Event) {
    if (
      (event.target as HTMLInputElement).checked &&
      this.detector.backend() === 'WebGPU'
    ) {
      this.detector.tracking.set(true);
      void this.track();
    } else this.stopTracking();
  }

  private stopTracking() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.detector.tracking.set(false);
  }

  private async track() {
    if (!this.detector.tracking() || !this.detector.ready()) return;
    const video = this.video();
    // Await the current scan before scheduling another one. A fixed setInterval
    // could pile up work on a slow device; this self-scheduling loop never overlaps
    // inference and skips captured frames while the video is paused.
    if (video && !video.paused)
      await this.detector.scan(video, this.threshold(), this.peopleOnly());
    // Slow devices stay usable: no overlap, at most one scan/second, and an automatic return to manual mode.
    if (this.detector.milliseconds() > 250) {
      this.stopTracking();
      this.detector.note.set(
        'Live tracking paused because inference exceeded 250 ms. Manual frame scanning remains available.',
      );
      return;
    }
    if (this.detector.tracking())
      this.timer = setTimeout(
        () => {
          void this.track();
        },
        Math.max(1000, this.detector.milliseconds() * 4),
      );
  }
}
