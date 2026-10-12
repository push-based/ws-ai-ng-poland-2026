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

  downloadMonitor(signal: AbortSignal): CreateMonitorCallback {
    return (monitor) =>
      monitor.addEventListener('downloadprogress', (event) => {
        if (!signal.aborted) this.downloadProgress.set(event.loaded);
      });
  }

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
      signal.throwIfAborted();
      return result;
    } catch (error) {
      if (this.controller === controller)
        this.taskError.set(signal.aborted ? 'Cancelled.' : errorMessage(error));
      throw error;
    } finally {
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
    const reader = stream.getReader();
    let result = '';
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
