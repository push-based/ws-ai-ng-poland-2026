import {
  Component,
  OnDestroy,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { movies } from '@nano-cinema/catalogue';
import type { DiscoveredTool } from '../../../core/webmcp/webmcp-client';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import { isTodo } from '../../shared/todo';
import { LabSimulation } from '../../shared/simulation.service';
import {
  describeResult,
  discoverTools,
  executeByName,
  missingWebmcp,
  schemaText,
  webmcpMode,
} from '../webmcp-page-tools';
import {
  Watchlist,
  getModelContext,
  registerAll,
  watchlistTools,
} from './exercise';

interface ExampleCall {
  name: string;
  args: Record<string, unknown>;
  argsText: string;
  note: string;
}

function example(
  name: string,
  args: Record<string, unknown>,
  note: string,
): ExampleCall {
  return { name, args, argsText: JSON.stringify(args), note };
}

/** Ready-made UI for exercise 4.4. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-imperative-webmcp',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabImperativeWebmcp implements OnDestroy {
  readonly log = new LabLog();
  readonly movies = movies;
  readonly entries = signal<{ id: string; title: string }[]>([]);
  readonly watchlist = new Watchlist(() =>
    this.entries.set(this.watchlist.list()),
  );
  readonly registered = signal(false);
  readonly mode = signal(webmcpMode());
  readonly discovered = signal<DiscoveredTool[]>([]);
  readonly result = signal<
    { call: string; text: string; failed: boolean } | undefined
  >(undefined);
  readonly schemaText = schemaText;
  readonly examples: ExampleCall[] = [
    example('get_watchlist', {}, 'read-only'),
    example('add_to_watchlist', { movieId: 'dream' }, 'valid'),
    example('remove_from_watchlist', { movieId: 'dream' }, 'valid'),
    example(
      'add_to_watchlist',
      { movieId: 'titanic' },
      'your handler must reject it',
    ),
    example(
      'add_to_watchlist',
      { movieId: 'sintel', priority: 'high' },
      'unknown key: reject it',
    ),
  ];
  readonly devtoolsSnippet = `const tools = await document.modelContext.getTools();
console.table(tools.map(({ name, description }) => ({ name, description })));
const add = tools.find((tool) => tool.name === 'add_to_watchlist');
await document.modelContext.executeTool(add, { movieId: 'bunny' });`;
  private readonly simulation = inject(LabSimulation);
  private controller?: AbortController;

  constructor() {
    // Switching the simulation swaps document.modelContext: tools registered in
    // the old object are gone, so release our registration and start again.
    effect(() => {
      this.simulation.enabled();
      untracked(() => {
        if (this.registered())
          this.unregister('The WebMCP mode changed: register the tools again.');
        this.mode.set(webmcpMode());
      });
    });
  }

  /** Steps 1, 3 and 4: find WebMCP, build the tools and register them with one signal. */
  async register() {
    this.mode.set(webmcpMode());
    await this.log.run('registerAll()', async () => {
      const context = getModelContext();
      if (!context) throw new Error(missingWebmcp);
      const controller = new AbortController();
      try {
        await registerAll(
          context,
          watchlistTools(this.watchlist),
          controller.signal,
        );
      } catch (error) {
        controller.abort(); // release any tool that was registered before the failure
        throw error;
      }
      this.controller = controller;
      this.registered.set(true);
    });
    if (this.registered()) await this.discover();
  }

  /** Aborting the signal passed to registerTool() is how a page unregisters tools. */
  unregister(
    reason = 'controller.abort(): the browser removed the three tools.',
  ) {
    this.controller?.abort();
    this.controller = undefined;
    this.registered.set(false);
    this.discovered.set([]);
    this.log.ok(reason);
  }

  async discover() {
    this.mode.set(webmcpMode());
    const tools = await this.log.run('document.modelContext.getTools()', () =>
      discoverTools(),
    );
    if (tools) this.discovered.set(tools);
  }

  /** Like an agent would: the browser finds the tool and calls your execute(). */
  async execute(call: ExampleCall) {
    const label = `executeTool(${call.name}, ${call.argsText})`;
    this.log.info(`${label}…`);
    try {
      const result = await executeByName(call.name, call.args);
      this.result.set({
        call: label,
        text: describeResult(result),
        failed: false,
      });
      this.log.ok(`${label}: done`);
    } catch (error) {
      const text =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
      this.result.set({ call: label, text, failed: true });
      if (isTodo(error)) this.log.add('todo', error.message);
      else this.log.add('error', `${label}: ${text}`);
    }
  }

  /** The human UI uses the same Watchlist methods as the tools. */
  toggle(movieId: string) {
    if (!this.watchlist.remove(movieId)) this.watchlist.add(movieId);
  }

  isListed(movieId: string): boolean {
    return this.entries().some((entry) => entry.id === movieId);
  }

  async copySnippet() {
    try {
      await navigator.clipboard.writeText(this.devtoolsSnippet);
      this.log.ok('Copied the DevTools snippet.');
    } catch {
      this.log.info('Copy failed: select the snippet and copy it by hand.');
    }
  }

  ngOnDestroy() {
    // Leaving the page must remove the tools, or an agent could call a page that is gone.
    this.controller?.abort();
  }
}
