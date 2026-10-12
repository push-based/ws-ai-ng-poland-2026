import {
  Component,
  inject,
  viewChild,
  ElementRef,
  afterNextRender,
  DestroyRef,
  signal,
} from '@angular/core';
import {
  LucideAudioLines,
  LucideRadio,
  LucideTerminal,
  LucideRotateCcw,
} from '@lucide/angular';
import { AudioMix, audioPresets } from '@nano-cinema/catalogue';
import { CinemaService } from '../core/cinema.service';
import { ToolsService } from '../core/tools.service';
@Component({
  selector: 'app-cinema-booth',
  imports: [LucideAudioLines, LucideRadio, LucideTerminal, LucideRotateCcw],
  template: `
    <section class="booth panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">THE PROJECTION BOOTH</span>
          <h2><svg lucideAudioLines></svg> Sound, shaped by you.</h2>
        </div>
        <span class="api-chip">Web Audio + WebMCP</span>
      </div>
      <p class="intro">
        A real audio graph. Human hands or structured tools. The same controls.
      </p>
      <div class="spectrum">
        <div class="spectrum-label">
          <span><svg lucideRadio></svg> LIVE FREQUENCY SPECTRUM</span
          ><span>{{
            cinema.audio.active()
              ? 'AUDIO CONNECTED'
              : 'PRESS PLAY TO CONNECT AUDIO'
          }}</span>
        </div>
        <canvas
          #spectrum
          width="700"
          height="150"
          aria-label="Live audio frequency spectrum"
        ></canvas>
        <div class="frequencies">
          <span>20 Hz</span><span>250 Hz</span><span>1 kHz</span
          ><span>4 kHz</span><span>20 kHz</span>
        </div>
      </div>
      <div class="mixer">
        @for (band of bands; track band.key) {
          <div class="channel">
            <span class="band-name">{{ band.label }}</span
            ><span class="band-frequency">{{ band.frequency }}</span>
            <div class="fader">
              <div class="ticks">
                <span>+12</span><span>0</span><span>−12</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                [value]="cinema.audio.mix()[band.key]"
                (input)="mix(band.key, $event)"
                [attr.aria-label]="band.label + ' gain in decibels'"
              />
            </div>
            <output
              >{{ cinema.audio.mix()[band.key] > 0 ? '+' : ''
              }}{{ cinema.audio.mix()[band.key] }} <small>dB</small></output
            >
          </div>
        }
        <div class="channel master">
          <span class="band-name">MASTER</span
          ><span class="band-frequency">OUTPUT LEVEL</span>
          <div class="fader">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              [value]="cinema.audio.mix().volume"
              (input)="mix('volume', $event)"
              aria-label="Master volume"
            />
          </div>
          <output>{{ volume() }} <small>%</small></output>
        </div>
      </div>
      <div class="presets">
        <span class="micro">LISTENING PRESETS</span>
        @for (preset of presets; track preset.key) {
          <button (click)="cinema.audio.preset(preset.key)">
            {{ preset.label }}
          </button>
        }
        <button
          class="reset"
          (click)="cinema.audio.preset('flat')"
          aria-label="Reset audio mix"
        >
          <svg lucideRotateCcw></svg>
        </button>
      </div>
      <div class="agent">
        <div>
          <span class="eyebrow">AGENT-READY, BY DESIGN</span>
          <h3><svg lucideTerminal></svg> Give the booth a direction.</h3>
        </div>
        <p>
          Expose meaningful operations with an input schema. An external WebMCP
          agent can apply the mix and see the same state you do.
        </p>
        <label class="micro"
          ><input
            type="checkbox"
            [checked]="native()"
            (change)="native.set(!native())"
            [disabled]="!tools.nativeExecution()"
          />
          Execute through native WebMCP discovery + execution</label
        >
        <div class="tool-examples">
          <button (click)="example('dialogue')">
            “Make the dialogue clearer”</button
          ><button (click)="example('night')">“Set a quiet night mix”</button
          ><button (click)="example('state')">Read screening state</button
          ><button (click)="example('invalid')">
            Test invalid bass: 99 dB
          </button>
        </div>
        <p class="micro">
          {{
            native()
              ? 'These buttons discover and execute the registered browser tools. They do not run an agent model.'
              : 'These buttons call local handlers directly; they do not simulate an agent or prove WebMCP transport.'
          }}
        </p>
        <button
          class="button secondary small"
          (click)="tools.register()"
          [disabled]="tools.registered()"
        >
          {{
            tools.registered()
              ? 'Tools registered with WebMCP'
              : 'Register native WebMCP tools'
          }}
        </button>
        @if (tools.error()) {
          <p class="micro">{{ tools.error() }}</p>
        }
        @if (feedback()) {
          <p class="feedback" aria-live="polite">{{ feedback() }}</p>
        }
      </div>
      @if (tools.log().length) {
        <details open>
          <summary>Tool execution log</summary>
          @for (call of tools.log(); track $index) {
            <div class="tool-log">
              <code>{{ call.name }}</code>
              <pre>{{ call.args }}</pre>
              <pre>{{ call.result }}</pre>
            </div>
          }
        </details>
      }
    </section>
  `,
  styles: [
    `
      .booth {
        padding: 28px;
      }
      .booth h2 {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .booth h2 svg {
        color: var(--amber);
      }
      .intro {
        color: var(--muted);
        font-size: 13px;
      }
      .spectrum {
        background: #0b0e10;
        border: 1px solid #303435;
        border-radius: 10px;
        padding: 18px;
        margin: 25px 0;
      }
      .spectrum-label {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 8px;
        letter-spacing: 1px;
        color: var(--muted);
      }
      .spectrum-label span:first-child {
        display: flex;
        gap: 5px;
        align-items: center;
        color: var(--amber);
      }
      .spectrum-label svg {
        width: 12px;
        height: 12px;
      }
      .spectrum canvas {
        display: block;
        width: 100%;
        height: 140px;
      }
      .frequencies {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #626968;
      }
      .mixer {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        background: linear-gradient(145deg, #24272a, #16191b);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 24px 8px;
        box-shadow: inset 0 1px 0 #ffffff10;
      }
      .channel {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        border-right: 1px solid var(--line);
      }
      .channel:last-child {
        border-right: 0;
      }
      .band-name {
        font-size: 11px;
        font-weight: 650;
        letter-spacing: 2px;
      }
      .band-frequency {
        font-size: 8px;
        color: var(--muted);
        letter-spacing: 1px;
      }
      .fader {
        position: relative;
        height: 150px;
        margin: 10px 0;
        width: 55px;
        display: flex;
        justify-content: center;
      }
      .fader input {
        writing-mode: vertical-lr;
        direction: rtl;
        width: 22px;
        height: 150px;
        accent-color: var(--amber);
        cursor: ns-resize;
      }
      .ticks {
        position: absolute;
        left: -10px;
        top: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 8px;
        color: #7f888d;
      }
      .channel output {
        font-family: monospace;
        color: var(--amber);
        font-size: 18px;
        background: #0a0d0e;
        border: 1px solid #363c3d;
        padding: 9px 14px;
        border-radius: 5px;
        min-width: 68px;
        text-align: center;
      }
      .channel output small {
        font-size: 9px;
        color: var(--muted);
      }
      .master {
        background: #e8b66905;
      }
      .presets {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding: 20px 0;
      }
      .presets > span {
        margin-right: auto;
      }
      .presets button {
        border: 1px solid var(--line);
        background: #232629;
        color: var(--text);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
      }
      .presets .reset {
        padding: 7px;
      }
      .reset svg {
        width: 13px;
        height: 13px;
      }
      .agent {
        border-top: 1px solid var(--line);
        padding-top: 24px;
        margin-top: 4px;
      }
      .agent h3 {
        display: flex;
        gap: 10px;
        align-items: center;
        font-size: 20px;
        margin: 10px 0;
      }
      .agent h3 svg {
        width: 19px;
        color: var(--amber);
      }
      .agent > p {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.6;
      }
      .tool-examples {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 18px 0;
      }
      .tool-examples button {
        background: #e8b66908;
        color: var(--text);
        border: 1px solid #e8b66930;
        border-radius: 8px;
        padding: 12px;
        font-size: 11px;
        text-align: left;
      }
      .feedback {
        border-left: 2px solid var(--amber);
        padding-left: 12px;
        overflow-wrap: anywhere;
      }
      details {
        margin-top: 24px;
        border-top: 1px solid var(--line);
        padding-top: 18px;
      }
      summary {
        font-size: 12px;
        color: var(--muted);
        cursor: pointer;
      }
      .tool-log {
        padding: 15px;
        background: #0c1012;
        margin: 10px 0;
        border-radius: 8px;
      }
      .tool-log code {
        font-size: 11px;
        color: var(--amber);
      }
      .tool-log pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font-size: 10px;
        color: var(--muted);
        line-height: 1.7;
      }
      @media (max-width: 550px) {
        .booth {
          padding: 18px;
        }
        .spectrum-label {
          flex-direction: column;
        }
        .channel output {
          padding: 8px;
          min-width: 48px;
        }
        .band-name {
          letter-spacing: 1px;
          font-size: 10px;
        }
        .band-frequency {
          font-size: 7px;
        }
        .tool-examples {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Booth {
  readonly cinema = inject(CinemaService);
  readonly tools = inject(ToolsService);
  readonly feedback = signal('');
  readonly native = signal(false);
  readonly spectrum =
    viewChild.required<ElementRef<HTMLCanvasElement>>('spectrum');
  readonly bands: {
    key: 'bass' | 'mid' | 'treble';
    label: string;
    frequency: string;
  }[] = [
    { key: 'bass', label: 'BASS', frequency: '180 HZ · LOW SHELF' },
    { key: 'mid', label: 'MID', frequency: '1.4 KHZ · PEAK' },
    { key: 'treble', label: 'TREBLE', frequency: '4.2 KHZ · HIGH SHELF' },
  ];
  readonly presets: { key: keyof typeof audioPresets; label: string }[] = [
    { key: 'flat', label: 'Flat' },
    { key: 'dialogue', label: 'Dialogue' },
    { key: 'cinema', label: 'Cinema' },
    { key: 'night', label: 'Night' },
  ];
  private frame = 0;
  constructor() {
    afterNextRender(() => this.draw());
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }
  volume() {
    return Math.round(this.cinema.audio.mix().volume * 100);
  }
  mix(key: keyof AudioMix, event: Event) {
    this.cinema.audio.apply({
      ...this.cinema.audio.mix(),
      [key]: Number((event.target as HTMLInputElement).value),
    });
  }
  async example(kind: 'dialogue' | 'night' | 'invalid' | 'state') {
    try {
      await this.tools.example(kind, this.native());
      this.feedback.set(
        kind === 'state'
          ? 'Screening state read. See the tool log.'
          : 'Applied to the audio graph. See the controls and tool log.',
      );
    } catch (error) {
      this.feedback.set(error instanceof Error ? error.message : String(error));
    }
  }
  private draw() {
    const canvas = this.spectrum().nativeElement;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const data = this.cinema.audio.spectrum();
      const count = 64;
      const gap = 4;
      const width = (canvas.width - gap * (count - 1)) / count;
      for (let i = 0; i < count; i++) {
        const value = data[i * 2] / 255;
        const height = Math.max(2, value * 130);
        context.fillStyle = value > 0.6 ? '#f5cf80' : '#b28b48';
        context.globalAlpha = value > 0 ? 0.65 + value * 0.35 : 0.2;
        context.fillRect(
          i * (width + gap),
          canvas.height - height,
          width,
          height,
        );
      }
      context.globalAlpha = 1;
    }
    this.frame = requestAnimationFrame(() => this.draw());
  }
}
