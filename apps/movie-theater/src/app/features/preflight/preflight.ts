import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiRuntime } from '../../ai/ai-runtime.service';
import { ConciergeService } from '../concierge/concierge.service';
import { PreflightService } from './preflight.service';
import { EvaluationService } from '../evaluation/evaluation.service';

@Component({
  selector: 'app-preflight',
  imports: [RouterLink],
  templateUrl: './preflight.html',
  styleUrl: './preflight.css',
})
export class Preflight {
  readonly preflight = inject(PreflightService);
  readonly evaluation = inject(EvaluationService);
  readonly runtime = inject(AiRuntime);
  private readonly concierge = inject(ConciergeService);
  readonly copied = signal('');
  readonly preparationError = signal('');
  readonly diagnostics = computed(() =>
    JSON.stringify(this.preflight.report(), null, 2),
  );
  readonly evaluationReport = computed(() =>
    JSON.stringify(this.evaluation.report(), null, 2),
  );
  readonly passed = computed(
    () =>
      this.evaluation.results().filter((result) => result.status === 'passed')
        .length,
  );

  async prepare() {
    this.preparationError.set('');
    this.runtime.setMode('native');
    try {
      await this.concierge.prepare();
      await this.preflight.check();
    } catch (error) {
      this.preparationError.set(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  fixtures() {
    this.runtime.setMode('fixture');
  }

  async copy(kind: 'diagnostics' | 'evaluation') {
    try {
      await navigator.clipboard.writeText(
        kind === 'diagnostics' ? this.diagnostics() : this.evaluationReport(),
      );
      this.copied.set(`${kind} copied`);
    } catch {
      this.copied.set(
        'Clipboard unavailable. Select and copy the report below.',
      );
    }
  }
}
