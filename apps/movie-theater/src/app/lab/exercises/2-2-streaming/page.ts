import { Component, OnDestroy, signal } from '@angular/core';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import { createSession, streamAnswer } from './exercise';

interface StreamStats {
  chunks: number;
  firstChunkMs?: number;
  totalMs?: number;
  stopped: boolean;
}

/** Ready-made UI for exercise 2.2. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-streaming',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabStreaming implements OnDestroy {
  readonly log = new LabLog();
  readonly question = signal('Something atmospheric for tonight?');
  readonly answer = signal('');
  readonly streaming = signal(false);
  readonly stats = signal<StreamStats | undefined>(undefined);
  readonly oneShot = signal<{ text: string; ms: number } | undefined>(
    undefined,
  );
  readonly hasSession = signal(false);
  readonly suggestions = [
    'Something atmospheric for tonight?',
    'Describe each of your three films for a film club newsletter.',
    'Which film suits a family evening, and why?',
  ];
  private session?: LanguageModel;
  private controller?: AbortController;

  /** Steps 1–3: stream the answer, measuring time to first chunk and total time. */
  async ask() {
    const question = this.question().trim();
    if (this.log.busy()) return;
    const session = await this.ensureSession();
    if (!session || !question) return;
    const controller = new AbortController();
    this.controller = controller;
    this.answer.set('');
    this.streaming.set(true);
    const started = performance.now();
    let chunks = 0;
    let firstChunkMs: number | undefined;
    this.stats.set({ chunks, stopped: false });
    await this.log.run('streamAnswer()', () =>
      streamAnswer(
        session,
        question,
        (textSoFar) => {
          chunks++;
          firstChunkMs ??= Math.round(performance.now() - started);
          this.answer.set(textSoFar);
          this.stats.set({ chunks, firstChunkMs, stopped: false });
        },
        controller.signal,
      ),
    );
    this.stats.set({
      chunks,
      firstChunkMs,
      totalMs: Math.round(performance.now() - started),
      stopped: controller.signal.aborted,
    });
    this.streaming.set(false);
    if (this.controller === controller) this.controller = undefined;
  }

  /** Stop button: aborting the controller's signal cancels the model and the reader. */
  stop() {
    this.controller?.abort();
  }

  /** For comparison: prompt() gives no text at all until the whole answer is ready. */
  async askWithoutStreaming() {
    const question = this.question().trim();
    if (this.log.busy()) return;
    const session = await this.ensureSession();
    if (!session || !question) return;
    this.oneShot.set(undefined);
    const started = performance.now();
    const text = await this.log.run('session.prompt() (no streaming)', () =>
      session.prompt(question),
    );
    if (text !== undefined)
      this.oneShot.set({ text, ms: Math.round(performance.now() - started) });
  }

  newSession() {
    this.controller?.abort();
    this.session?.destroy();
    this.session = undefined;
    this.hasSession.set(false);
    this.answer.set('');
    this.stats.set(undefined);
    this.oneShot.set(undefined);
    this.log.info(
      'Session destroyed. The next question starts a new conversation.',
    );
  }

  setQuestion(event: Event) {
    this.question.set((event.target as HTMLInputElement).value);
  }

  private async ensureSession(): Promise<LanguageModel | undefined> {
    if (!this.session) {
      this.session = await this.log.run('createSession() (given)', () =>
        createSession(),
      );
      this.hasSession.set(!!this.session);
    }
    return this.session;
  }

  ngOnDestroy() {
    try {
      this.controller?.abort();
      this.session?.destroy();
    } catch {
      /* nothing else to release on this page */
    }
  }
}
