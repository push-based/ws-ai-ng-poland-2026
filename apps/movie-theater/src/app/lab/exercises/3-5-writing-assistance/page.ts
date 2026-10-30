import { Component, OnDestroy, signal } from '@angular/core';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  exampleNotes,
  proofreadComment,
  rewriteComment,
  writeComment,
} from './exercise';

interface Suggestion {
  source: 'Writer' | 'Rewriter' | 'Proofreader';
  text: string;
  note: string;
}

interface ApiState {
  name: string;
  exposed: boolean;
}

/** Ready-made UI for exercise 3.5. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-writing-assistance',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabWritingAssistance implements OnDestroy {
  readonly log = new LabLog();
  readonly tones: RewriterTone[] = ['more-formal', 'more-casual', 'as-is'];
  readonly exampleNotesText = exampleNotes;
  readonly draft = signal(exampleNotes);
  readonly tone = signal<RewriterTone>('more-formal');
  readonly suggestion = signal<Suggestion | undefined>(undefined);
  readonly saved = signal<string[]>([]);
  readonly apis = signal<ApiState[]>([]);
  readonly running = signal(false);
  private controller?: AbortController;

  setDraft(event: Event) {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }
  setTone(event: Event) {
    this.tone.set((event.target as HTMLSelectElement).value as RewriterTone);
  }

  checkApis() {
    const globals = globalThis as Record<string, unknown>;
    this.apis.set(
      ['Writer', 'Rewriter', 'Proofreader'].map((name) => ({
        name,
        exposed: typeof globals[name] !== 'undefined',
      })),
    );
  }

  private begin(): AbortSignal {
    this.controller?.abort();
    this.controller = new AbortController();
    this.running.set(true);
    this.suggestion.set(undefined);
    return this.controller.signal;
  }

  async write() {
    const signal = this.begin();
    const text = await this.log.run('writeComment()', () =>
      writeComment(this.draft(), signal),
    );
    if (text !== undefined)
      this.suggestion.set({
        source: 'Writer',
        text,
        note: 'New prose from your notes. Check that every opinion is really yours.',
      });
    this.running.set(false);
  }

  async rewrite() {
    const signal = this.begin();
    const text = await this.log.run(`rewriteComment(${this.tone()})`, () =>
      rewriteComment(this.draft(), this.tone(), signal),
    );
    if (text !== undefined)
      this.suggestion.set({
        source: 'Rewriter',
        text,
        note: `Your draft in a ${this.tone()} tone. Check that the meaning did not change.`,
      });
    this.running.set(false);
  }

  async proofread() {
    const signal = this.begin();
    const result = await this.log.run('proofreadComment()', () =>
      proofreadComment(this.draft(), signal),
    );
    if (result)
      this.suggestion.set({
        source: 'Proofreader',
        text: result.corrected,
        note: `${result.corrections} correction${result.corrections === 1 ? '' : 's'} suggested.`,
      });
    this.running.set(false);
  }

  stop() {
    this.controller?.abort();
    this.running.set(false);
  }

  /** The viewer decides: only Accept changes the draft. */
  accept() {
    const suggestion = this.suggestion();
    if (!suggestion) return;
    this.draft.set(suggestion.text);
    this.suggestion.set(undefined);
    this.log.info(
      `${suggestion.source} suggestion accepted into the draft (not saved).`,
    );
  }

  discard() {
    this.suggestion.set(undefined);
    this.log.info('Suggestion discarded. The draft is unchanged.');
  }

  /** Saving is a separate, explicit action. AI output is never saved on its own. */
  save() {
    const text = this.draft().trim();
    if (!text) return;
    this.saved.update((comments) => [text, ...comments]);
    this.log.ok('Comment saved (in this page only).');
  }

  ngOnDestroy() {
    // Aborting stops a running request; each step destroys its own model.
    this.controller?.abort();
  }
}
