import { Component, OnDestroy, inject, signal } from '@angular/core';
import { movies } from '@nano-cinema/catalogue';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  configureSimulation,
  defaultSimulationConfig,
} from '../../shared/simulated-ai';
import { LabSimulation } from '../../shared/simulation.service';
import { isTodo } from '../../shared/todo';
import {
  type ContextStats,
  type Measurement,
  compact,
  contextStats,
  createSession,
  fork,
  measureMessage,
  watchOverflow,
} from './exercise';

interface ChatLine {
  role: 'user' | 'assistant' | 'note';
  text: string;
}

/** One conversation column: the original, or the fork made with clone(). */
class Branch {
  readonly lines = signal<ChatLine[]>([]);
  readonly stats = signal<ContextStats | undefined>(undefined);
  readonly measurement = signal<Measurement | undefined>(undefined);
  readonly draft = signal('Something atmospheric for tonight?');
  unwatch?: () => void;

  constructor(
    readonly name: 'Original' | 'Fork',
    public session: LanguageModel,
  ) {}
}

const tinyWindow = 600;

/** Ready-made UI for exercise 2.4. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-context-window',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabContextWindow implements OnDestroy {
  readonly log = new LabLog();
  readonly simulation = inject(LabSimulation);
  readonly branches = signal<Branch[]>([]);
  readonly overflows = signal<{ time: string; branch: string; used: string }[]>(
    [],
  );
  readonly compaction = signal<
    | { branch: string; before: string; after: string; summary: string }
    | undefined
  >(undefined);
  readonly statsHint = signal('');
  readonly tiny = signal(false);
  readonly suggestions = [
    'Something atmospheric for tonight?',
    'Is it suitable for young kids?',
    'What did I ask you first?',
  ];
  /** About 340 simulated tokens: two of these overflow the tiny window. */
  readonly mediumMessage = `Please comment on these notes: ${movies[0].notes.join(' ')}`;
  /** About 1000 simulated tokens: more than the whole tiny window. */
  readonly longMessage = `Please comment on all of these notes: ${movies
    .flatMap((movie) => movie.notes)
    .join(' ')}`;

  /** Section A: start the original conversation. */
  async start() {
    if (this.log.busy()) return;
    this.end();
    const session = await this.log.run('createSession() (given)', () =>
      createSession(),
    );
    if (!session) return;
    const branch = new Branch('Original', session);
    this.watch(branch);
    this.branches.set([branch]);
    this.refresh(branch);
  }

  end() {
    for (const branch of this.branches()) this.release(branch);
    this.branches.set([]);
    this.compaction.set(undefined);
  }

  /** Simulation only: new sessions get a 600-token window, so overflow happens quickly. */
  async toggleTinyWindow() {
    const tiny = !this.tiny();
    configureSimulation({
      contextWindow: tiny ? tinyWindow : defaultSimulationConfig.contextWindow,
    });
    this.tiny.set(tiny);
    this.log.info(
      tiny
        ? `Simulated context window: ${tinyWindow} tokens. A new session was started.`
        : `Simulated context window back to ${defaultSimulationConfig.contextWindow} tokens. A new session was started.`,
    );
    await this.start();
  }

  /** Step 2: measure without sending. */
  async measure(branch: Branch) {
    const text = branch.draft().trim();
    if (!text) return;
    const result = await this.log.run(`measureMessage() · ${branch.name}`, () =>
      measureMessage(branch.session, text),
    );
    branch.measurement.set(result);
  }

  /** Measure first (Step 2); send only when the message fits. "Send anyway" skips the check. */
  async send(branch: Branch, measureFirst = true) {
    const text = branch.draft().trim();
    if (!text || this.log.busy()) return;
    let measured: Measurement | undefined;
    try {
      if (measureFirst) {
        measured = await measureMessage(branch.session, text);
        branch.measurement.set(measured);
      }
    } catch (error) {
      // Step 2 not done yet (todo): send without measuring. Other errors stop here.
      if (!isTodo(error)) {
        this.log.add(
          'error',
          `measureMessage(): ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }
    }
    if (measured && !measured.fits) {
      this.log.add(
        'error',
        `Not sent: the message needs ${measured.needed} tokens, but only ${measured.remaining} are free. Compact the conversation, shorten the message, or use "Send anyway" to see what happens.`,
      );
      return;
    }
    branch.lines.update((lines) => [...lines, { role: 'user', text }]);
    const answer = await this.log.run(`session.prompt() · ${branch.name}`, () =>
      branch.session.prompt(text),
    );
    if (answer !== undefined)
      branch.lines.update((lines) => [
        ...lines,
        { role: 'assistant', text: answer },
      ]);
    this.refresh(branch);
  }

  /** Step 4: fork the original. The fork column starts with a copy of its transcript. */
  async fork() {
    const original = this.branches().find(
      (branch) => branch.name === 'Original',
    );
    if (!original || this.log.busy()) return;
    const copy = await this.log.run('fork()', () => fork(original.session));
    if (!copy) return;
    const old = this.branches().find((branch) => branch.name === 'Fork');
    if (old) this.release(old);
    const branch = new Branch('Fork', copy);
    branch.lines.set([
      ...original.lines(),
      { role: 'note', text: 'Forked here.' },
    ]);
    branch.draft.set('Something funny instead?');
    this.watch(branch);
    this.branches.set([original, branch]);
    this.refresh(branch);
  }

  /** Step 5: replace a long conversation with a fresh session that holds a summary. */
  async compact(branch: Branch) {
    if (this.log.busy()) return;
    const before = this.describe(branch);
    const result = await this.log.run(`compact() · ${branch.name}`, () =>
      compact(branch.session),
    );
    if (!result) return;
    branch.unwatch?.();
    branch.session = result.session;
    this.watch(branch);
    this.refresh(branch);
    branch.lines.update((lines) => [
      ...lines,
      {
        role: 'note',
        text: `Compacted. The new session only knows: ${result.summary}`,
      },
    ]);
    this.compaction.set({
      branch: branch.name,
      before,
      after: this.describe(branch),
      summary: result.summary,
    });
  }

  setDraft(branch: Branch, event: Event) {
    branch.draft.set((event.target as HTMLTextAreaElement).value);
  }

  /** Step 1: read the context numbers after every change. */
  private refresh(branch: Branch) {
    try {
      branch.stats.set(contextStats(branch.session));
      this.statsHint.set('');
    } catch (error) {
      if (!isTodo(error)) throw error;
      if (!this.statsHint()) this.log.add('todo', error.message);
      this.statsHint.set(
        'Step 1 is not done yet: contextStats() still contains todo().',
      );
    }
  }

  private describe(branch: Branch): string {
    const stats = branch.stats();
    return stats
      ? `${stats.used} / ${stats.window} tokens (${stats.percent}%)`
      : 'unknown';
  }

  /** Step 3: log every contextoverflow event of this branch. */
  private watch(branch: Branch) {
    try {
      branch.unwatch = watchOverflow(branch.session, () => {
        this.overflows.update((events) =>
          [
            {
              time: new Date().toLocaleTimeString(),
              branch: branch.name,
              used: `${branch.session.contextUsage} / ${branch.session.contextWindow} tokens after eviction`,
            },
            ...events,
          ].slice(0, 20),
        );
        this.log.add(
          'error',
          `contextoverflow · ${branch.name}: old turns were dropped.`,
        );
      });
    } catch (error) {
      if (!isTodo(error)) throw error;
      this.log.add('todo', error.message);
    }
  }

  private release(branch: Branch) {
    try {
      branch.unwatch?.();
    } catch {
      /* the listener may never have been added */
    }
    branch.session.destroy();
  }

  ngOnDestroy() {
    try {
      this.end();
    } catch {
      /* nothing else to release on this page */
    }
    if (this.tiny())
      configureSimulation({
        contextWindow: defaultSimulationConfig.contextWindow,
      });
  }
}
