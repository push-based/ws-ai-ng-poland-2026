import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Detection, DetectorReply, DetectorRequest } from './detection.types';

/** Scoped to a player. Off means no worker, model fetch, frame loop, or GPU session. */
@Injectable()
export class ObjectDetectionService {
  readonly enabled = signal(false);
  readonly ready = signal(false);
  readonly tracking = signal(false);
  readonly busy = signal(false);
  readonly backend = signal('');
  readonly error = signal('');
  readonly note = signal('');
  readonly milliseconds = signal(0);
  readonly boxes = signal<Detection[]>([]);
  private worker?: Worker;
  // Each enable/disable cycle changes this counter. An old async load/scan may
  // finish after the viewer disables and re-enables detection; compare generations
  // before accepting its result so it cannot update the new detector instance.
  private generation = 0;
  private nextId = 0;
  private readonly pending = new Map<
    number,
    {
      resolve: (value: DetectorReply) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disable());
  }

  // This is the only place a worker is created. Merely opening the movie page
  // does not import ONNX Runtime, fetch weights, capture a frame or allocate a GPU
  // session. The load message prepares resources but does not start live inference.
  async enable() {
    if (this.enabled()) return;
    const generation = ++this.generation;
    this.enabled.set(true);
    this.busy.set(true);
    this.error.set('');
    this.note.set('');
    try {
      this.worker = new Worker(new URL('./detector.worker', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = (event: MessageEvent<DetectorReply>) =>
        this.receive(event.data);
      this.worker.onerror = () => {
        if (generation === this.generation) {
          this.failPending(new Error('The detector worker could not start.'));
        }
      };
      const result = await this.request({
        kind: 'load',
        modelUrl: new URL('models/yolox-nano.onnx', document.baseURI).href,
        runtimeUrl: new URL('models/ort/', document.baseURI).href,
      });
      if (result.kind !== 'ready')
        throw new Error('Unexpected detector initialization response.');
      if (generation !== this.generation) return;
      this.backend.set(result.backend);
      this.note.set(
        result.fallbackReason ? `WASM fallback: ${result.fallbackReason}` : '',
      );
      this.ready.set(true);
    } catch (error) {
      if (generation === this.generation && this.enabled()) {
        this.error.set(error instanceof Error ? error.message : String(error));
        this.disable(false);
      }
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }

  /** Terminating the worker also disposes its inference session and stops in-flight work. */
  disable(clearError = true) {
    this.generation++;
    this.tracking.set(false);
    this.worker?.terminate();
    this.worker = undefined;
    this.failPending(new Error('Detector disabled.'));
    this.enabled.set(false);
    this.ready.set(false);
    this.busy.set(false);
    this.boxes.set([]);
    this.backend.set('');
    if (clearError) this.error.set('');
  }

  clearBoxes() {
    this.boxes.set([]);
  }

  async scan(video: HTMLVideoElement, threshold: number, peopleOnly: boolean) {
    if (!this.ready() || this.busy() || video.readyState < 2) return;
    const generation = this.generation;
    this.busy.set(true);
    try {
      // Snapshot one frame so the worker scans a stable image even if playback
      // continues. createImageBitmap is asynchronous, so re-check ownership after
      // capture in case the viewer disabled detection while it was pending.
      const frame = await createImageBitmap(video);
      // A viewer can turn detection off while the frame capture is pending.
      if (!this.worker || generation !== this.generation) {
        frame.close();
        return;
      }
      // Transfer the bitmap instead of copying it. After postMessage, the worker
      // owns and closes it. The returned promise waits for a reply with the matching ID.
      const result = await this.request(
        { kind: 'scan', frame, threshold, peopleOnly },
        [frame],
      );
      if (result.kind !== 'result')
        throw new Error('Unexpected detector result.');
      if (generation !== this.generation) return;
      this.boxes.set(result.detections);
      this.milliseconds.set(result.milliseconds);
      this.error.set('');
    } catch (error) {
      if (generation === this.generation && this.enabled()) {
        this.error.set(error instanceof Error ? error.message : String(error));
        this.disable(false);
      }
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }

  // postMessage is fire-and-reply rather than an async function call. Store a
  // promise resolver by request ID, post the message, then resolve/reject when
  // receive() gets that ID back. Timeout and disable reject outstanding promises.
  private request(
    input:
      | Omit<Extract<DetectorRequest, { kind: 'load' }>, 'id'>
      | Omit<Extract<DetectorRequest, { kind: 'scan' }>, 'id'>,
    transfer: Transferable[] = [],
  ): Promise<DetectorReply> {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Detector timed out. Disable it and retry.'));
      }, 120_000);
      this.pending.set(id, { resolve, reject, timer });
      this.worker?.postMessage({ ...input, id }, transfer);
    });
  }

  private receive(reply: DetectorReply) {
    const entry = this.pending.get(reply.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(reply.id);
    if (reply.kind === 'error') entry.reject(new Error(reply.message));
    else entry.resolve(reply);
  }

  private failPending(error: Error) {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
  }
}
