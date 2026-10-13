import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { executePlan } from './evaluation.executor';
import {
  parameterSchema,
  parseParameters,
  parsePlan,
  selectionSchema,
  parseSelection,
  type AgentPlan,
} from './evaluation.agent';
import {
  selectionInstruction,
  selectionPrompt,
  extractionInstruction,
  parameterPrompt,
} from './evaluation.prompts';
import { PromptApi } from '../../ai/prompt/prompt.api';
import { errorMessage } from '../../ai/ai.types';
import { CinemaService } from '../../core/cinema.service';
import { WebmcpService } from '../../core/webmcp/webmcp.service';
import {
  EvaluationCase,
  EvaluationCall,
  EvaluationResult,
  evaluationCases,
  gradeEvaluation,
} from './evaluation.model';

@Injectable({ providedIn: 'root' })
export class EvaluationService {
  readonly running = signal(false);
  readonly current = signal('');
  readonly results = signal<EvaluationResult[]>([]);
  readonly error = signal('');
  private readonly prompt = inject(PromptApi);
  private readonly cinema = inject(CinemaService);
  private readonly tools = inject(WebmcpService);
  private readonly router = inject(Router);
  private controller?: AbortController;

  stop() {
    this.controller?.abort();
  }

  async runAll() {
    if (this.running()) return;
    this.running.set(true);
    this.results.set([]);
    this.error.set('');
    this.controller = new AbortController();
    try {
      await this.tools.register();
      if (!this.tools.nativeExecution())
        throw new Error(
          'Native document.modelContext discovery/execution is required. Enable WebMCP and retry.',
        );
      // This runner deliberately uses real local Prompt inference, even if the
      // cinema's fixture mode is selected. Never count a scripted planner as an agent eval.
      for (const scenario of evaluationCases) {
        this.controller.signal.throwIfAborted();
        this.current.set(scenario.title);
        const result = await this.runCase(
          scenario,
          AbortSignal.any([
            this.controller.signal,
            AbortSignal.timeout(60_000),
          ]),
        );
        this.results.update((results) => [...results, result]);
      }
    } catch (error) {
      this.error.set(
        this.controller.signal.aborted
          ? 'Evaluation cancelled.'
          : errorMessage(error),
      );
    } finally {
      this.running.set(false);
      this.current.set('');
      this.controller = undefined;
      await this.router.navigate(['/preflight']);
    }
  }

  report() {
    return {
      schemaVersion: 1,
      strategy: 'isolated-capabilities-v1',
      recordedAt: new Date().toISOString(),
      browser: navigator.userAgent,
      caller: 'In-app local Prompt API planner',
      transport: 'Native document.modelContext discovery / executeTool',
      results: this.results(),
      error: this.error(),
    };
  }

  private async runCase(
    scenario: EvaluationCase,
    signal: AbortSignal,
  ): Promise<EvaluationResult> {
    this.cinema.reset();
    await this.router.navigate(['/movies', 'sintel']);
    await this.waitForPlayer(signal);
    const before = this.cinema.state();
    const calls: EvaluationCall[] = [];
    let answer = '';
    let selectedTools: string[] = [];
    let phase = 'capability selection';
    let session: LanguageModel | undefined;
    try {
      const discovered = await this.tools.discoverNative();
      // Progressive disclosure chooses capabilities first, then extracts each
      // capability's parameters in fresh context. These are distinct model tasks;
      // carrying the classifier's output into a new JSON shape confused the model.
      session = await this.prompt.create(signal, [
        { role: 'system', content: selectionInstruction },
      ]);
      const selection = parseSelection(
        JSON.parse(
          await session.prompt(selectionPrompt(scenario.request, discovered), {
            signal,
            responseConstraint: selectionSchema(discovered),
          }),
        ),
        discovered,
      );
      selectedTools = selection.tools.map((tool) => tool.name);
      session.destroy();
      session = undefined;
      const actions: AgentPlan['actions'] = [];
      let explanation = selection.explanation;
      for (const tool of selection.tools) {
        phase = `extract arguments for ${tool.name}`;
        signal.throwIfAborted();
        session = await this.prompt.create(signal, [
          { role: 'system', content: extractionInstruction },
        ]);
        const parameters = parseParameters(
          JSON.parse(
            await session.prompt(parameterPrompt(scenario.request, tool), {
              signal,
              responseConstraint: parameterSchema(tool),
            }),
          ),
        );
        session.destroy();
        session = undefined;
        if (!parameters.needed) continue;
        if (!parameters.valid) {
          // Reject a compound request before any step has changed the page.
          actions.length = 0;
          explanation = parameters.explanation;
          break;
        }
        actions.push({ tool: tool.name, args: parameters.args });
      }
      const plan = parsePlan(
        {
          actions: actions.map((action) => ({
            tool: action.tool,
            arguments: action.args,
          })),
          explanation,
        },
        selection.tools,
      );
      phase = 'validate and execute plan';
      const execution = await executePlan(
        plan,
        selection.tools,
        async (action) => {
          const result = await this.tools.invokeNative(
            action.tool,
            action.args,
          );
          await this.waitForPlayer(signal);
          return result;
        },
        signal,
      );
      calls.push(...execution.calls);
      const completed = execution.completed;
      answer = execution.answer;
      const after = this.cinema.state();
      const renderedMix = this.renderedMix();
      const uiMatches =
        renderedMix !== null &&
        Object.entries(after.audioMix).every(
          ([key, value]) =>
            renderedMix[key as keyof typeof renderedMix] === value,
        );
      const passed =
        uiMatches &&
        completed &&
        answer.trim().length > 0 &&
        gradeEvaluation(scenario.id, calls, before, after);
      return {
        id: scenario.id,
        request: scenario.request,
        status: passed ? 'passed' : 'failed',
        calls,
        answer,
        before,
        after,
        renderedMix,
        selectedTools,
        detail: !uiMatches
          ? 'Rendered sliders disagree with the reported mix.'
          : !completed
            ? 'Plan was rejected or execution stopped; inspect the call evidence.'
            : passed
              ? 'Tool calls and observed state satisfy the case.'
              : 'Observed calls/state do not satisfy the case; inspect the trace.',
      };
    } catch (error) {
      if (this.controller?.signal.aborted) signal.throwIfAborted();
      return {
        id: scenario.id,
        request: scenario.request,
        status: 'error',
        calls,
        answer,
        before,
        after: this.cinema.state(),
        renderedMix: this.renderedMix(),
        selectedTools,
        detail: `${phase}: ${errorMessage(error)}`,
      };
    } finally {
      // Every case gets fresh context and releases its model. Navigation caused
      // by tools must not destroy this root-owned runner before it grades results.
      session?.destroy();
    }
  }

  private renderedMix() {
    // Eval evidence includes actual input.value properties, not just the service
    // snapshot that the tool itself reports. This catches model/UI agreement bugs.
    const bass = document.querySelector<HTMLInputElement>(
      'input[aria-label="BASS gain in decibels"]',
    );
    const mid = document.querySelector<HTMLInputElement>(
      'input[aria-label="MID gain in decibels"]',
    );
    const treble = document.querySelector<HTMLInputElement>(
      'input[aria-label="TREBLE gain in decibels"]',
    );
    const volume = document.querySelector<HTMLInputElement>(
      'input[aria-label="Master volume"]',
    );
    return bass && mid && treble && volume
      ? {
          bass: Number(bass.value),
          mid: Number(mid.value),
          treble: Number(treble.value),
          volume: Number(volume.value),
        }
      : null;
  }

  private async waitForPlayer(signal: AbortSignal) {
    const deadline = performance.now() + 8000;
    while (!this.cinema.video || this.cinema.video.readyState < 1) {
      signal.throwIfAborted();
      if (performance.now() > deadline)
        throw new Error(
          'Player metadata did not load; run pnpm media:download.',
        );
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }
}
