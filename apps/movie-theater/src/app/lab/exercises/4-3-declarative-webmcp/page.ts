import {
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { movies } from '@nano-cinema/catalogue';
import type { DiscoveredTool } from '../../../core/webmcp/webmcp-client';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import { LabSimulation } from '../../shared/simulation.service';
import { isTodo } from '../../shared/todo';
import {
  browserModelContext,
  describeResult,
  discoverTools,
  executeByName,
  schemaText,
  webmcpMode,
  type BrowserModelContext,
} from '../webmcp-page-tools';
import {
  ReservationStore,
  handleReservationSubmit,
  type AgentSubmitEvent,
  type ConfirmedReservation,
} from './exercise';
import { LabReservationForm } from './reservation-form';

interface AgentCall {
  label: string;
  args: Record<string, unknown>;
  argsText: string;
}

function agentCall(label: string, args: Record<string, unknown>): AgentCall {
  return { label, args, argsText: JSON.stringify(args) };
}

/** Ready-made UI for exercise 4.3. Participants edit exercise.html and exercise.ts. */
@Component({
  selector: 'app-lab-declarative-webmcp',
  imports: [LabFrame, LabReservationForm],
  templateUrl: './page.html',
})
export class LabDeclarativeWebmcp implements OnDestroy {
  readonly log = new LabLog();
  readonly reservations = signal<readonly ConfirmedReservation[]>([]);
  readonly store = new ReservationStore((items) =>
    this.reservations.set(items),
  );
  readonly mode = signal(webmcpMode());
  readonly tool = signal<DiscoveredTool | undefined>(undefined);
  readonly toolCount = signal<number | undefined>(undefined);
  readonly lastSubmit = signal<{ by: string; text: string } | undefined>(
    undefined,
  );
  readonly agentResult = signal<
    { call: string; text: string; failed: boolean } | undefined
  >(undefined);
  readonly waiting = signal(false);
  readonly schemaText = schemaText;
  readonly calls = [
    agentCall('Valid request', {
      movieId: 'dream',
      seats: 2,
      showtime: '20:30',
    }),
    agentCall('Too many seats', {
      movieId: 'sintel',
      seats: 9,
      showtime: '22:45',
    }),
  ];
  readonly devtoolsSnippet = `const tools = await document.modelContext.getTools();
const reserve = tools.find((tool) => tool.name === 'reserve_seats');
console.log(reserve.inputSchema);
await document.modelContext.executeTool(reserve, { movieId: 'bunny', seats: 3, showtime: '18:00' });`;
  private readonly simulation = inject(LabSimulation);
  private readonly formHost = viewChild.required(LabReservationForm, {
    read: ElementRef,
  });
  private listening?: BrowserModelContext;
  private readonly onToolEvent = (event: Event) =>
    this.log.info(
      `document.modelContext fired "${event.type}" for ${(event as Event & { toolName?: string }).toolName ?? 'a tool'}.`,
    );

  constructor() {
    // The simulation switch can swap document.modelContext: follow it.
    effect(() => {
      this.simulation.enabled();
      untracked(() => {
        this.mode.set(webmcpMode());
        this.listen(browserModelContext());
      });
    });
  }

  /** Steps 4–5: people and agents both end up here, through the form's submit event. */
  onSubmit(event: SubmitEvent) {
    const by = (event as AgentSubmitEvent).agentInvoked
      ? 'an agent'
      : 'a person';
    // run() calls the handler synchronously, so respondWith() happens during the event.
    void this.log
      .run(`handleReservationSubmit() · submitted by ${by}`, () =>
        handleReservationSubmit(event, this.store),
      )
      .then((result) => {
        if (result) this.lastSubmit.set({ by, text: describeResult(result) });
      });
    if (!event.defaultPrevented) {
      event.preventDefault();
      this.log.info(
        'The page called preventDefault() for you, so the browser did not reload. Step 5 must do this.',
      );
    }
  }

  /** What the browser derived from your HTML (Steps 1–3). */
  async discover() {
    this.mode.set(webmcpMode());
    const tools = await this.log.run('document.modelContext.getTools()', () =>
      discoverTools(),
    );
    if (!tools) return;
    this.toolCount.set(tools.length);
    const tool = tools.find((candidate) => candidate.name === 'reserve_seats');
    this.tool.set(tool);
    if (!tool)
      this.log.add(
        'todo',
        'No tool named reserve_seats yet. Step 1: add toolname="reserve_seats" and tooldescription="…" to the <form> in exercise.html.',
      );
  }

  /** Like an agent: the browser fills the fields and (with toolautosubmit) submits. */
  async agentFill(call: AgentCall) {
    const label = `executeTool(reserve_seats, ${call.argsText})`;
    const form = (this.formHost().nativeElement as HTMLElement).querySelector(
      'form',
    );
    const autosubmit = form?.hasAttribute('toolautosubmit') ?? false;
    this.log.info(`${label}…`);
    if (!autosubmit)
      this.log.info(
        'No toolautosubmit (Step 3): the agent fills the form and waits for you to press "Reserve seats".',
      );
    this.waiting.set(!autosubmit);
    try {
      const result = await executeByName('reserve_seats', call.args);
      this.agentResult.set({
        call: label,
        text: describeResult(result),
        failed: false,
      });
      this.log.ok(`${label}: the agent received a result`);
    } catch (error) {
      const text =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
      this.agentResult.set({ call: label, text, failed: true });
      if (isTodo(error)) this.log.add('todo', error.message);
      else this.log.add('error', `${label}: ${text}`);
    } finally {
      this.waiting.set(false);
    }
  }

  titleOf(movieId: string): string {
    return movies.find((movie) => movie.id === movieId)?.title ?? movieId;
  }

  async copySnippet() {
    try {
      await navigator.clipboard.writeText(this.devtoolsSnippet);
      this.log.ok('Copied the DevTools snippet.');
    } catch {
      this.log.info('Copy failed: select the snippet and copy it by hand.');
    }
  }

  // Chrome fires toolactivated / toolcancel on document.modelContext for
  // declarative tools. The simulation does not fire them.
  private listen(context: BrowserModelContext | undefined) {
    if (this.listening === context) return;
    this.stopListening();
    if (typeof context?.addEventListener !== 'function') return;
    context.addEventListener('toolactivated', this.onToolEvent);
    context.addEventListener('toolcancel', this.onToolEvent);
    this.listening = context;
  }

  private stopListening() {
    this.listening?.removeEventListener('toolactivated', this.onToolEvent);
    this.listening?.removeEventListener('toolcancel', this.onToolEvent);
    this.listening = undefined;
  }

  ngOnDestroy() {
    // A declarative tool disappears with its <form>; only our listeners need removing.
    this.stopListening();
  }
}
