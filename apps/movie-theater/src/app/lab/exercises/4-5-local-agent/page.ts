import {
  Component,
  OnDestroy,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import { LabSimulation } from '../../shared/simulation.service';
import { isTodo } from '../../shared/todo';
import {
  Watchlist,
  getModelContext,
  registerAll,
  watchlistTools,
} from '../4-4-imperative-webmcp/exercise';
import {
  browserModelContext,
  describeResult,
  missingWebmcp,
  webmcpMode,
} from '../webmcp-page-tools';
import {
  createAgentSession,
  runAgent,
  type AgentContext,
  type AgentRun,
} from './exercise';

interface RunView {
  request: string;
  run: AgentRun;
  resultText: string;
  ms: number;
}

/** Ready-made UI for exercise 4.5. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-local-agent',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabLocalAgent implements OnDestroy {
  readonly log = new LabLog();
  readonly entries = signal<{ id: string; title: string }[]>([]);
  readonly watchlist = new Watchlist(() =>
    this.entries.set(this.watchlist.list()),
  );
  readonly mode = signal(webmcpMode());
  readonly toolsReady = signal(false);
  readonly needs44 = signal(false);
  readonly session = signal<LanguageModel | undefined>(undefined);
  readonly running = signal(false);
  readonly request = signal('Add to watchlist: Sintel');
  readonly runs = signal<RunView[]>([]);
  readonly baseUsage = signal('');
  readonly suggestions = [
    'Add to watchlist: Sintel',
    'Add to watchlist: Elephants Dream',
    'Get watchlist',
    'Remove from watchlist: Sintel',
    'What does a bass filter do?',
    'Could you put the bunny film on my list for later?',
  ];
  private readonly simulation = inject(LabSimulation);
  private registration?: AbortController;
  private run?: AbortController;

  constructor() {
    // The simulation switch swaps document.modelContext and LanguageModel: start over.
    effect(() => {
      this.simulation.enabled();
      untracked(() => {
        if (this.toolsReady() || this.session()) {
          this.release();
          this.log.info(
            'The AI mode changed: click "Prepare the agent" again.',
          );
        }
        this.mode.set(webmcpMode());
      });
    });
  }

  /** Register YOUR tools from exercise 4.4, then create the base session. */
  async prepare() {
    this.mode.set(webmcpMode());
    this.needs44.set(false);
    if (!this.toolsReady()) {
      const controller = new AbortController();
      try {
        const context = getModelContext();
        if (!context) throw new Error(missingWebmcp);
        await registerAll(
          context,
          watchlistTools(this.watchlist),
          controller.signal,
        );
        this.registration = controller;
        this.toolsReady.set(true);
        this.log.ok('Registered the watchlist tools from exercise 4.4.');
      } catch (error) {
        controller.abort();
        if (isTodo(error)) {
          this.needs44.set(true);
          this.log.add(
            'todo',
            `${error.message} Finish exercise 4.4 first, or run: pnpm lab:solve 4-4`,
          );
        } else
          this.log.add(
            'error',
            `registerAll(): ${error instanceof Error ? error.message : String(error)}`,
          );
        return;
      }
    }
    if (!this.session()) {
      const session = await this.log.run('createAgentSession()', () =>
        createAgentSession(),
      );
      if (session) this.session.set(session);
    }
    this.refreshUsage();
  }

  /** Steps 1–4: one request → at most one tool call. */
  async ask() {
    const session = this.session();
    const request = this.request().trim();
    const context = browserModelContext();
    if (!session || !request || this.running()) return;
    if (!context?.getTools || !context.executeTool) {
      this.log.add('error', missingWebmcp);
      return;
    }
    const controller = new AbortController();
    this.run = controller;
    this.running.set(true);
    const started = performance.now();
    const run = await this.log.run('runAgent()', () =>
      runAgent(request, context as AgentContext, session, controller.signal),
    );
    this.running.set(false);
    if (this.run === controller) this.run = undefined;
    if (run)
      this.runs.update((runs) =>
        [
          {
            request,
            run,
            resultText:
              run.tool === 'none'
                ? 'No tool was executed.'
                : describeResult(run.result),
            ms: Math.round(performance.now() - started),
          },
          ...runs,
        ].slice(0, 5),
      );
    this.refreshUsage();
  }

  stop() {
    this.run?.abort();
  }

  argsText(run: AgentRun): string {
    return JSON.stringify(run.args);
  }

  setRequest(event: Event) {
    this.request.set((event.target as HTMLInputElement).value);
  }

  private refreshUsage() {
    const session = this.session();
    this.baseUsage.set(
      session
        ? `Base session: ${session.contextUsage} / ${session.contextWindow} tokens (unchanged by runs)`
        : '',
    );
  }

  private release() {
    this.run?.abort();
    this.registration?.abort();
    this.registration = undefined;
    this.toolsReady.set(false);
    this.session()?.destroy();
    this.session.set(undefined);
    this.baseUsage.set('');
  }

  ngOnDestroy() {
    try {
      this.release();
    } catch {
      /* nothing else to release on this page */
    }
  }
}
