import { Component, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  getMovie,
  type Movie,
  type Recommendation,
} from '@nano-cinema/catalogue';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import { isTodo } from '../../shared/todo';
import {
  askForJson,
  createSession,
  parseRecommendation,
  recommendationSchema,
} from './exercise';

interface Verdict {
  text: string;
  accepted: boolean;
  detail: string;
}

/** Ready-made UI for exercise 2.3. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-structured-output',
  imports: [LabFrame, RouterLink],
  templateUrl: './page.html',
})
export class LabStructuredOutput implements OnDestroy {
  readonly log = new LabLog();
  readonly request = signal('Something with dragons and a long journey?');
  readonly schemaPreview = signal('');
  readonly raw = signal('');
  readonly rawLabel = signal('');
  readonly result = signal<
    { recommendation: Recommendation; movie: Movie } | undefined
  >(undefined);
  readonly verdicts = signal<Verdict[]>([]);
  readonly suggestions = [
    'Something with dragons and a long journey?',
    'A short, funny film for kids',
    'I want Titanic.',
  ];
  /** Answers a model (or an attacker) could produce. Only the first one is usable. */
  readonly samples = [
    '{"movieId":"bunny","reason":"Short, funny and without dialogue."}',
    '{"movieId":"titanic","reason":"A classic love story."}',
    '{"movieId":"sintel"}',
    'Sure! Here is my pick: {"movieId":"sintel","reason":"Dragons."}',
    '{"movieId":"dream","reason":"Calm."',
  ];
  private session?: LanguageModel;
  private controller?: AbortController;

  showSchema() {
    void this.log.run('recommendationSchema()', () => {
      this.schemaPreview.set(JSON.stringify(recommendationSchema(), null, 2));
    });
  }

  /** Steps 2–3: constrained JSON from the model, then validation in code. */
  async recommend() {
    const session = await this.ensureSession();
    const request = this.request().trim();
    if (!session || !request) return;
    this.reset();
    const controller = new AbortController();
    this.controller = controller;
    const text = await this.log.run('askForJson()', () =>
      askForJson(session, request, controller.signal),
    );
    if (text === undefined) return;
    this.raw.set(text);
    this.rawLabel.set('Raw answer with responseConstraint (a string):');
    this.accept(text);
  }

  /** For comparison: the same request without a schema usually is not JSON at all. */
  async askWithoutSchema() {
    const session = await this.ensureSession();
    const request = this.request().trim();
    if (!session || !request) return;
    this.reset();
    const text = await this.log.run('session.prompt() without a schema', () =>
      session.prompt(request),
    );
    if (text === undefined) return;
    this.raw.set(text);
    this.rawLabel.set('Raw answer without a schema:');
    this.accept(text);
  }

  /** Section C: run parseRecommendation() on prepared answers. */
  checkSamples() {
    const verdicts: Verdict[] = [];
    for (const text of this.samples) {
      try {
        const recommendation = parseRecommendation(text);
        verdicts.push({
          text,
          accepted: true,
          detail: `accepted: ${recommendation.movieId}`,
        });
      } catch (error) {
        if (isTodo(error)) {
          this.log.add('todo', error.message);
          return;
        }
        verdicts.push({
          text,
          accepted: false,
          detail: `rejected: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
    this.verdicts.set(verdicts);
    this.log.ok(
      `parseRecommendation(): ${verdicts.filter((v) => v.accepted).length} of ${verdicts.length} answers accepted`,
    );
  }

  stop() {
    this.controller?.abort();
  }

  setRequest(event: Event) {
    this.request.set((event.target as HTMLInputElement).value);
  }

  private accept(text: string) {
    void this.log.run('parseRecommendation()', () => {
      const recommendation = parseRecommendation(text);
      this.result.set({
        recommendation,
        movie: getMovie(recommendation.movieId),
      });
    });
  }

  private reset() {
    this.raw.set('');
    this.rawLabel.set('');
    this.result.set(undefined);
  }

  private async ensureSession(): Promise<LanguageModel | undefined> {
    if (this.log.busy()) return undefined;
    this.session ??= await this.log.run('createSession() (given)', () =>
      createSession(),
    );
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
