import {
  Component,
  inject,
  afterNextRender,
  Injector,
  viewChild,
  ElementRef,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { LucideFilm, LucideCpu, LucideRotateCcw } from '@lucide/angular';
import { CinemaService } from './core/cinema.service';
import { InspectorState } from './core/inspector-state.service';
import { WebmcpService } from './core/webmcp/webmcp.service';
import { AiInspector } from './features/inspector/inspector';
import { AiRuntime } from './ai/ai-runtime.service';
import { CapabilitiesService } from './ai/capabilities.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    RouterOutlet,
    LucideFilm,
    LucideCpu,
    LucideRotateCcw,
    AiInspector,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly cinema = inject(CinemaService);
  readonly runtime = inject(AiRuntime);
  readonly capabilities = inject(CapabilitiesService);
  readonly tools = inject(WebmcpService);
  readonly inspector = inject(InspectorState);
  readonly inspectorOpen = this.inspector.open;
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  readonly inspectorButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('inspectorButton');

  closeInspector() {
    this.inspector.hide();
    afterNextRender(() => this.inspectorButton().nativeElement.focus(), {
      injector: this.injector,
    });
  }

  constructor() {
    afterNextRender(() => {
      void this.initializeCapabilities();
      void this.tools.register();
    });
  }

  private async initializeCapabilities() {
    await this.capabilities.check();
    if (
      this.capabilities.capabilities().find((api) => api.name === 'Prompt')
        ?.state === 'missing'
    )
      this.runtime.setMode('fixture');
  }

  reset() {
    this.cinema.reset();
    void this.router.navigate(['/']);
    this.tools.log.set([]);
    this.runtime.clearTraces();
  }

  switchMode(event: Event) {
    this.runtime.setMode(
      (event.target as HTMLSelectElement).value as 'native' | 'fixture',
    );
  }
}
