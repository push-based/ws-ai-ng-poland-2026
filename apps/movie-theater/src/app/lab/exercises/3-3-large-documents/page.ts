import { Component, OnDestroy, signal } from '@angular/core';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  configureSimulation,
  defaultSimulationConfig,
  isSimulatedAiInstalled,
} from '../../shared/simulated-ai';
import {
  type InputBudget,
  type Stage,
  charsPerToken,
  chunkOptions,
  createSummarizer,
  finalOptions,
  fitsInQuota,
  longDocument,
  splitIntoChunks,
  summarizeLarge,
} from './exercise';

/** The pretend quota used by "Simulate a tiny quota". */
const tinyQuota = 300;

/** Ready-made UI for exercise 3.3. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-large-documents',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabLargeDocuments implements OnDestroy {
  readonly log = new LabLog();
  readonly document = longDocument;
  readonly paragraphCount = longDocument.split(/\n\s*\n/).length;
  readonly roughTokens = Math.ceil(longDocument.length / 4);
  readonly tinyQuota = tinyQuota;

  readonly tiny = signal(true);
  readonly budget = signal<InputBudget | undefined>(undefined);
  readonly maxChars = signal(tinyQuota * charsPerToken);
  readonly chunks = signal<string[]>([]);
  readonly stages = signal<Stage[]>([]);
  readonly summary = signal('');
  readonly running = signal(false);
  private controller?: AbortController;

  setTiny(event: Event) {
    this.tiny.set((event.target as HTMLInputElement).checked);
    this.budget.set(undefined);
  }

  setMaxChars(event: Event) {
    this.maxChars.set(Number((event.target as HTMLInputElement).value) || 1);
  }

  /** Apply the quota choice. Returns the pretend quota for your code, or undefined for the real inputQuota. */
  private applyQuota(): number | undefined {
    // In simulated mode the fake summarizer enforces its quota too, so set it to match.
    if (isSimulatedAiInstalled())
      configureSimulation({
        inputQuota: this.tiny()
          ? tinyQuota
          : defaultSimulationConfig.inputQuota,
      });
    return this.tiny() ? tinyQuota : undefined;
  }

  private begin(): AbortSignal {
    this.controller?.abort();
    this.controller = new AbortController();
    this.running.set(true);
    return this.controller.signal;
  }

  async measure() {
    const signal = this.begin();
    const quota = this.applyQuota();
    const budget = await this.log.run('fitsInQuota()', async () => {
      const summarizer = await createSummarizer(chunkOptions, signal);
      try {
        this.log.info(
          `This summarizer's real inputQuota: ${summarizer.inputQuota} tokens`,
        );
        return await fitsInQuota(
          summarizer,
          longDocument,
          Math.min(summarizer.inputQuota, quota ?? Infinity),
          signal,
        );
      } finally {
        summarizer.destroy();
      }
    });
    this.budget.set(budget);
    this.running.set(false);
  }

  /** The naive approach, for comparison: send everything in one call. */
  async oneCall() {
    const signal = this.begin();
    this.applyQuota();
    const result = await this.log.run(
      'summarize() the whole document in one call',
      async () => {
        const summarizer = await createSummarizer(finalOptions, signal);
        try {
          return await summarizer.summarize(longDocument, { signal });
        } finally {
          summarizer.destroy();
        }
      },
    );
    if (result !== undefined)
      this.log.info(`One call worked: ${result.slice(0, 120)}…`);
    this.running.set(false);
  }

  split() {
    void this.log.run('splitIntoChunks()', () => {
      this.chunks.set(splitIntoChunks(longDocument, this.maxChars()));
    });
  }

  async summarize() {
    const signal = this.begin();
    const quota = this.applyQuota();
    this.stages.set([]);
    this.summary.set('');
    const summary = await this.log.run('summarizeLarge()', () =>
      summarizeLarge(
        longDocument,
        (stage) => this.stages.update((stages) => [...stages, stage]),
        signal,
        quota,
      ),
    );
    if (summary !== undefined) this.summary.set(summary);
    this.running.set(false);
  }

  stop() {
    this.controller?.abort();
    this.running.set(false);
  }

  percent(budget: InputBudget): number {
    return Math.min(100, (budget.usage / budget.quota) * 100);
  }

  ngOnDestroy() {
    this.controller?.abort();
    // Leave the simulation as other exercises expect it.
    configureSimulation({ inputQuota: defaultSimulationConfig.inputQuota });
  }
}
