import {
  Component,
  inject,
  signal,
  output,
  afterNextRender,
  viewChild,
  ElementRef,
} from '@angular/core';
import { JsonPipe } from '@angular/common';
import { LucideX, LucideCpu } from '@lucide/angular';
import { AiService } from '../core/ai.service';
import { ToolsService } from '../core/tools.service';
@Component({
  selector: 'app-workshop-lens',
  imports: [JsonPipe, LucideX, LucideCpu],
  template: `
    <aside
      #panel
      class="lens"
      role="dialog"
      aria-modal="true"
      aria-label="Workshop Lens"
      tabindex="-1"
      (keydown.escape)="dismiss.emit()"
    >
      <div class="lens-header">
        <div>
          <span class="eyebrow">UNDER THE HOOD</span>
          <h2><svg lucideCpu></svg> Workshop Lens</h2>
        </div>
        <button (click)="dismiss.emit()" aria-label="Close Workshop Lens">
          <svg lucideX></svg>
        </button>
      </div>
      <div class="lens-tabs">
        @for (item of tabs; track item) {
          <button [class.active]="tab() === item" (click)="tab.set(item)">
            {{ item }}
          </button>
        }
      </div>
      <div class="lens-body">
        @if (tab() === 'Setup') {
          <p class="micro">{{ userAgent }}</p>
          <p class="intro">
            Inspect capabilities before creating a model. A JavaScript global
            alone does not prove your device can run the requested task.
          </p>
          <div class="mode">
            <label
              >Execution mode<select
                [value]="ai.mode()"
                (change)="mode($event)"
                [disabled]="ai.busy()"
              >
                <option value="native">Native browser AI</option>
                <option value="fixture">Workshop fixtures</option>
              </select></label
            >
          </div>
          <p class="micro">
            Fixtures are deterministic teaching examples. Native mode never
            silently falls back.
          </p>
          <div class="actions">
            <button class="button secondary small" (click)="ai.check()">
              Check capabilities</button
            ><button
              class="button primary small"
              (click)="prepare()"
              [disabled]="ai.busy()"
            >
              Prepare Prompt model
            </button>
          </div>
          @if (ai.busy()) {
            <p class="micro">
              Preparing / processing… {{ percent(ai.progress()) }}% downloaded
              <button (click)="ai.stop()">Cancel</button>
            </p>
          }
          @for (api of ai.capabilities(); track api.name) {
            <div class="capability">
              <div>
                <strong>{{ api.name }}</strong>
                <p>{{ api.detail }}</p>
              </div>
              <span [class.ready]="api.state === 'available'">{{
                api.state
              }}</span>
            </div>
          }
          <div class="setup-note">
            <strong
              >WebMCP:
              {{ tools.registered() ? 'registered' : 'not registered' }}</strong
            >
            <p>
              Local Chrome setup: enable
              <code>chrome://flags/#enable-webmcp-testing</code>, relaunch, then
              register tools from the projection booth.
            </p>
            <p>
              The app and media need no remote service. Native model downloads
              need connectivity and an eligible desktop device. Prepare models
              before testing offline.
            </p>
            <p>
              “Zero token cost” means no cloud per-token inference bill for
              local execution. Tokens, device compute and downloads still exist.
            </p>
          </div>
          <label class="detector"
            >Language detection<input
              [value]="sample()"
              (input)="sample.set(value($event))"
              placeholder="Szukam dobrego filmu na wieczór" /></label
          ><button
            class="button secondary small"
            (click)="detect()"
            [disabled]="ai.busy() || !sample().trim()"
          >
            Detect text language
          </button>
          @if (ai.detected(); as detected) {
            <pre>{{ detected | json }}</pre>
            <p class="micro">
              Short inputs may be ambiguous. Detection does not choose your
              viewing language.
            </p>
          }
        }
        @if (tab() === 'API trace') {
          <p class="intro">
            Calls and configuration from this session. Generated text is
            rendered as text, never executable HTML.
          </p>
          @for (trace of ai.traces(); track $index) {
            <article class="trace">
              <span>{{ trace.time }} · {{ trace.api }}</span>
              <h3>{{ trace.operation }}</h3>
              <pre>{{ trace.detail }}</pre>
            </article>
          } @empty {
            <p class="micro">Use an AI feature to see its calls here.</p>
          }
        }
        @if (tab() === 'Tools') {
          <p class="intro">
            WebMCP exposes page operations. The companion MCP server exposes
            catalogue tools, resources and prompts over stdio. A calling agent
            may have its own costs.
          </p>
          @if (tools.discovered().length) {
            <details>
              <summary>
                Native browser discovery · {{ tools.discovered().length }} tools
              </summary>
              <pre>{{ tools.discovered() | json }}</pre>
            </details>
          }
          @for (tool of tools.tools; track tool.name) {
            <details>
              <summary>{{ tool.name }}</summary>
              <p>{{ tool.description }}</p>
              <pre>{{ tool.inputSchema | json }}</pre>
            </details>
          }
          <div class="setup-note">
            <strong>MCP companion</strong>
            <p>Build: <code>pnpm nx build cinema-mcp</code></p>
            <p>Host command: <code>node apps/cinema-mcp/dist/main.js</code></p>
            <p>
              Tool: search_movies<br />Resources: cinema://movies/:id<br />Prompt:
              film_club_discussion
            </p>
          </div>
        }
        @if (tab() === 'Agenda') {
          @for (block of agenda; track block.title) {
            <article class="trace">
              <span>{{ block.time }}</span>
              <h3>{{ block.title }}</h3>
              <p>{{ block.text }}</p>
            </article>
          }
          <div class="setup-note">
            <strong>Later: ONNX Runtime Web</strong>
            <p>
              A small person detector could analyse a captured frame locally,
              overlay bounding boxes and show model load/inference time. Keep it
              a separate lazy-loaded extension; verify model licensing, actual
              download size and WebGPU/WASM support before choosing it.
            </p>
          </div>
        }
      </div>
    </aside>
  `,
  styles: [
    `
      .lens {
        position: fixed;
        right: 0;
        top: 0;
        bottom: 0;
        width: 460px;
        max-width: 100%;
        z-index: 50;
        background: #13171a;
        border-left: 1px solid #3b4043;
        box-shadow: -30px 0 80px #0007;
        display: flex;
        flex-direction: column;
      }
      .lens-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 28px 24px;
      }
      .lens-header h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 21px;
        margin: 8px 0 0;
      }
      .lens-header svg {
        width: 20px;
        color: var(--amber);
      }
      .lens-header button {
        background: transparent;
        border: 0;
        color: var(--muted);
        padding: 8px;
      }
      .lens-tabs {
        display: flex;
        border-bottom: 1px solid var(--line);
        padding: 0 16px;
      }
      .lens-tabs button {
        flex: 1;
        padding: 14px 4px;
        border: 0;
        border-bottom: 2px solid transparent;
        background: none;
        color: var(--muted);
        font-size: 12px;
      }
      .lens-tabs .active {
        color: var(--amber);
        border-color: var(--amber);
      }
      .lens-body {
        overflow-y: auto;
        padding: 24px;
      }
      .intro {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
        margin-top: 0;
      }
      .mode label,
      .detector {
        font-size: 12px;
        color: var(--muted);
        display: block;
      }
      .mode select {
        display: block;
        width: 100%;
        margin-top: 8px;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin: 18px 0;
      }
      .capability {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--line);
        padding: 16px 0;
        gap: 12px;
      }
      .capability strong {
        font-size: 12px;
      }
      .capability p {
        font-size: 10px;
        color: var(--muted);
        margin: 6px 0 0;
      }
      .capability > span {
        font-size: 9px;
        background: #293034;
        border: 1px solid #41474b;
        padding: 5px 8px;
        border-radius: 20px;
        color: var(--muted);
      }
      .capability > span.ready {
        color: #b5d2b6;
        background: #25453055;
        border-color: #4d7655;
      }
      .setup-note {
        background: #e8b66908;
        border: 1px solid #e8b66920;
        border-radius: 8px;
        padding: 16px;
        margin: 24px 0;
      }
      .setup-note strong {
        font-size: 12px;
        color: var(--amber);
      }
      .setup-note p {
        font-size: 12px;
        line-height: 1.7;
        color: var(--muted);
      }
      .setup-note code {
        font-size: 10px;
        overflow-wrap: anywhere;
      }
      .detector input {
        display: block;
        width: 100%;
        margin: 8px 0 12px;
        padding: 12px;
        background: #0b0e10;
        border: 1px solid var(--line);
        border-radius: 7px;
        color: var(--text);
      }
      .trace {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 12px;
      }
      .trace > span {
        font-size: 9px;
        color: var(--amber);
      }
      .trace h3 {
        font-size: 14px;
        margin: 9px 0;
      }
      .trace p,
      details p {
        font-size: 12px;
        line-height: 1.7;
        color: var(--muted);
      }
      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font-size: 10px;
        line-height: 1.7;
        color: var(--muted);
        background: #0b0e10;
        padding: 12px;
        border-radius: 6px;
      }
      details {
        border-bottom: 1px solid var(--line);
        padding: 16px 0;
      }
      summary {
        font-family: monospace;
        font-size: 12px;
        color: var(--amber);
        cursor: pointer;
      }
    `,
  ],
})
export class Lens {
  readonly ai = inject(AiService);
  readonly userAgent = navigator.userAgent;
  readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  constructor() {
    afterNextRender(() => this.panel().nativeElement.focus());
  }
  readonly tools = inject(ToolsService);
  readonly dismiss = output();
  readonly tab = signal('Setup');
  readonly tabs = ['Setup', 'API trace', 'Tools', 'Agenda'];
  readonly sample = signal('Szukam dobrego filmu na wieczór');
  readonly agenda = [
    {
      time: '10:15–11:20',
      title: '1 · The AI-native browser',
      text: 'Capability matrix, exact options, native versus fixtures, model preparation and local/cloud boundaries.',
    },
    {
      time: '11:35–12:50',
      title: '2 · Prompt API',
      text: 'Concierge sessions, streaming and cancellation, validated movie IDs, context meter, fork/reset/compaction, captured-frame image input.',
    },
    {
      time: '13:35–14:35',
      title: '3 · Task-specific AI',
      text: 'Summary styles and lengths, section summaries, language detection, Polish translation and caption timings.',
    },
    {
      time: '14:50–15:25',
      title: '4A · MCP',
      text: 'The TypeScript companion server: discover tools, read film-note resources, request a discussion prompt.',
    },
    {
      time: '15:25–16:40',
      title: '4B · WebMCP',
      text: 'Declarative catalogue search and imperative projection-booth tools. Validate arguments, inspect state transitions and recover from failures.',
    },
  ];
  value(event: Event) {
    return (event.target as HTMLInputElement).value;
  }
  percent(value: number) {
    return Math.round(value * 100);
  }
  mode(event: Event) {
    this.ai.setMode(this.value(event) as 'native' | 'fixture');
  }
  async prepare() {
    try {
      await this.ai.prepare();
    } catch {
      /* Visible global error. */
    }
  }
  async detect() {
    try {
      await this.ai.detect(this.sample());
    } catch {
      /* Visible global error. */
    }
  }
}
