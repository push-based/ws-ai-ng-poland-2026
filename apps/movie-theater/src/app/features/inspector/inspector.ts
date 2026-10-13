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
import { AiRuntime } from '../../ai/ai-runtime.service';
import { CapabilitiesService } from '../../ai/capabilities.service';
import { DetectedLanguage } from '../../ai/ai.types';
import { LanguageDetectorApi } from '../../ai/language/language-detector.api';
import { fixtureLanguage } from '../../ai/fixtures';
import { ConciergeService } from '../concierge/concierge.service';
import { WebmcpService } from '../../core/webmcp/webmcp.service';
@Component({
  selector: 'app-ai-inspector',
  imports: [JsonPipe, LucideX, LucideCpu],
  templateUrl: './inspector.html',
  styleUrl: './inspector.css',
})
export class AiInspector {
  readonly runtime = inject(AiRuntime);
  readonly capabilities = inject(CapabilitiesService);
  private readonly concierge = inject(ConciergeService);
  private readonly languages = inject(LanguageDetectorApi);
  readonly detected = signal<DetectedLanguage | null>(null);
  readonly userAgent = navigator.userAgent;
  readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  constructor() {
    afterNextRender(() => this.panel().nativeElement.focus());
  }

  readonly tools = inject(WebmcpService);
  readonly dismiss = output();
  readonly tab = signal('Setup');
  readonly tabs = ['Setup', 'API trace', 'Tools'];
  readonly sample = signal('Szukam dobrego filmu na wieczór');

  value(event: Event) {
    return (event.target as HTMLInputElement).value;
  }

  percent(value: number) {
    return Math.round(value * 100);
  }

  mode(event: Event) {
    this.runtime.setMode(this.value(event) as 'native' | 'fixture');
  }

  // availability() only reports a configuration's support/readiness. Preparing
  // creates the concierge session, which can download the actual model, then
  // checks availability again so participants can observe the state transition.
  async prepare() {
    try {
      await this.concierge.prepare();
      await this.capabilities.check();
    } catch {
      /* Visible global error. */
    }
  }

  async detect() {
    try {
      this.detected.set(
        await this.runtime.run('LanguageDetector', 'detect()', (signal) =>
          this.runtime.mode() === 'fixture'
            ? Promise.resolve(fixtureLanguage(this.sample()))
            : this.languages.detect(this.sample(), signal),
        ),
      );
    } catch {
      /* Visible global error. */
    }
  }
}
