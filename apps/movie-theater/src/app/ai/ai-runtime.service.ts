import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { AiMode, ApiName, Trace, errorMessage } from './ai.types';
/** Shared execution state only. Feature services own conversations and results. */
@Injectable({ providedIn: 'root' })
export class AiRuntime {
  private readonly currentMode = signal<AiMode>('native');
  private readonly running = signal(false);
  private readonly downloadProgress = signal(0);
  private readonly taskError = signal('');
  private readonly streamText = signal('');
  private readonly traceEntries = signal<Trace[]>([]);
  private readonly resetCount = signal(0);
  readonly mode = this.currentMode.asReadonly();
  readonly busy = this.running.asReadonly();
  readonly progress = this.downloadProgress.asReadonly();
  readonly error = this.taskError.asReadonly();
  readonly streamed = this.streamText.asReadonly();
  readonly traces = this.traceEntries.asReadonly();
  readonly revision = this.resetCount.asReadonly();
  private controller?: AbortController;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  setMode(mode: AiMode) {
    if (mode === this.mode()) return;
    this.reset();
    this.currentMode.set(mode);
  }

  /** Abort in-flight work before resetting state; old completions must not own the next task. */
  reset() {
    this.controller?.abort();
    this.controller = undefined;
    this.running.set(false);
    this.taskError.set('');
    this.streamText.set('');
    this.downloadProgress.set(0);
    this.resetCount.update((n) => n + 1);
  }

  stop() {
    this.controller?.abort();
  }

  clearTraces() {
    this.traceEntries.set([]);
  }

  trace(api: string, operation: string, detail: string) {
    this.traceEntries.update((entries) =>
      [
        { api, operation, detail, time: new Date().toLocaleTimeString() },
        ...entries,
      ].slice(0, 40),
    );
  }

  setStreamed(text: string) {
    this.streamText.set(text);
  }

  // create() can trigger a browser-managed model download. The monitor exposes
  // progress events, whose loaded value is a fraction for the progress UI. Ignore
  // events from cancelled work so an old download cannot update the next task.
  downloadMonitor(signal: AbortSignal): CreateMonitorCallback {
    return (monitor) =>
      monitor.addEventListener('downloadprogress', (event) => {
        if (!signal.aborted) this.downloadProgress.set(event.loaded);
      });
  }

  // Call availability() with the same configuration that will be passed to create().
  // 'downloadable' is allowed: creation can fetch the model. 'unavailable' is a real
  // capability failure and should be shown instead of pretending inference succeeded.
  async require(api: ApiName, availability: () => Promise<Availability>) {
    this.trace(api, 'availability()', 'Checking exact task configuration');
    if ((await availability()) === 'unavailable')
      throw new Error(
        `${api} is unavailable for this device/configuration. Choose demo fixtures to continue.`,
      );
  }

  /** Serializes model tasks and uses controller identity to guard stale finally/catch callbacks. */
  async run<T>(
    api: string,
    operation: string,
    work: (signal: AbortSignal) => Promise<T>,
    externalSignal?: AbortSignal,
  ): Promise<T> {
    if (this.busy())
      throw new Error('Another AI task is running. Stop it or wait.');
    // One controller represents this entire operation, including composed API calls.
    // If a WebMCP caller also supplies a cancellation signal, AbortSignal.any lets
    // either the viewer's Stop button or that caller cancel the same work.
    const controller = new AbortController();
    this.controller = controller;
    const signal = externalSignal
      ? AbortSignal.any([controller.signal, externalSignal])
      : controller.signal;
    this.running.set(true);
    this.taskError.set('');
    this.streamText.set('');
    this.downloadProgress.set(0);
    this.trace(api, operation, `${this.mode()} mode`);
    try {
      const result = await work(signal);
      // Some implementations finish a promise even after cancellation. Check again
      // before handing a result to the feature so cancelled output cannot be accepted.
      signal.throwIfAborted();
      return result;
    } catch (error) {
      if (this.controller === controller)
        this.taskError.set(signal.aborted ? 'Cancelled.' : errorMessage(error));
      throw error;
    } finally {
      // Reset can start a new operation before an old promise finishes. Only the
      // controller still stored as current may clear busy/error state for that operation.
      if (this.controller === controller) {
        this.controller = undefined;
        this.running.set(false);
      }
    }
  }

  /** Render incremental output as text and actively cancel blocked reads when the user stops. */
  async stream(
    stream: ReadableStream<string>,
    signal: AbortSignal,
  ): Promise<string> {
    this.streamText.set('');
    // A streaming API returns a ReadableStream instead of one final string. Read
    // chunks in order and accumulate them for display. This code treats chunks as
    // additional text, so the feature gets both live progress and the final text.
    const reader = stream.getReader();
    let result = '';
    // Aborting the model request alone might leave reader.read() waiting. Cancel the
    // reader too, then remove the listener and release the lock in finally, including
    // when streaming fails. This prevents a stopped operation from hanging the UI.
    const cancel = () => {
      void reader.cancel(signal.reason).catch(() => undefined);
    };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      while (true) {
        signal.throwIfAborted();
        const { value, done } = await reader.read();
        signal.throwIfAborted();
        if (done) break;
        result += value;
        this.streamText.set(result);
      }
      return result;
    } finally {
      signal.removeEventListener('abort', cancel);
      reader.releaseLock();
    }
  }
}
