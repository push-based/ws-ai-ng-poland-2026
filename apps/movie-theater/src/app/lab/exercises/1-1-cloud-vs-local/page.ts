import { Component, OnDestroy, computed, signal } from '@angular/core';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  type ArchitectureDecision,
  type ArchitectureNeeds,
  type CloudCost,
  type Measurement,
  chooseArchitecture,
  createSession,
  estimateCloudCost,
  examplePrices,
  measureOptions,
  measurePrompt,
} from './exercise';

interface MeasuredRow extends Measurement {
  prompt: string;
}

type NeedFlag = 'dataIsSensitive' | 'mustWorkOffline' | 'needsLargeModel';

const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
});

/** Ready-made UI for exercise 1.1. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-cloud-vs-local',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabCloudVsLocal implements OnDestroy {
  readonly log = new LabLog();
  readonly session = signal<LanguageModel | undefined>(undefined);
  readonly usage = signal('');
  readonly prompt = signal(
    'In two sentences: what makes an animated short film memorable?',
  );
  readonly suggestions = [
    'In two sentences: what makes an animated short film memorable?',
    'Say hi.',
    'Write a 150-word programme note for an open-movie night at a small cinema.',
  ];
  readonly rows = signal<MeasuredRow[]>([]);
  readonly last = computed<MeasuredRow | undefined>(() => this.rows()[0]);

  readonly inputPrice = signal(examplePrices.inputPerMillion);
  readonly outputPrice = signal(examplePrices.outputPerMillion);
  readonly requestsPerMonth = signal(100_000);
  readonly cost = signal<CloudCost | undefined>(undefined);

  readonly availabilityStates: ArchitectureNeeds['localAvailability'][] = [
    'available',
    'downloadable',
    'downloading',
    'unavailable',
    'missing',
  ];
  readonly needs = signal<ArchitectureNeeds>({
    localAvailability: 'available',
    dataIsSensitive: false,
    mustWorkOffline: false,
    needsLargeModel: false,
  });
  readonly decision = signal<ArchitectureDecision | undefined>(undefined);
  private controller?: AbortController;

  async start() {
    this.controller = new AbortController();
    const session = await this.log.run('createSession()', () =>
      createSession(this.controller?.signal),
    );
    if (!session) return;
    this.session.set(session);
    this.refreshUsage();
  }

  async measure() {
    const session = this.session();
    const text = this.prompt().trim();
    if (!session || !text) return;
    const result = await this.log.run('measurePrompt()', () =>
      measurePrompt(session, text, this.controller?.signal),
    );
    if (!result) return;
    this.rows.update((rows) => [{ ...result, prompt: text }, ...rows]);
    this.refreshUsage();
  }

  end() {
    this.controller?.abort();
    this.session()?.destroy();
    this.session.set(undefined);
    this.usage.set('');
    this.log.info('Session destroyed.');
  }

  estimate() {
    const last = this.last();
    if (!last) {
      this.log.info('Measure a prompt in section A first.');
      return;
    }
    void this.log.run('estimateCloudCost()', () => {
      this.cost.set(
        estimateCloudCost(
          last,
          {
            inputPerMillion: this.inputPrice(),
            outputPerMillion: this.outputPrice(),
          },
          this.requestsPerMonth(),
        ),
      );
    });
  }

  async useThisDevice() {
    const state = await this.log.run(
      'LanguageModel.availability()',
      async () =>
        typeof LanguageModel === 'undefined'
          ? ('missing' as const)
          : LanguageModel.availability(measureOptions),
    );
    if (state) this.setNeed('localAvailability', state);
  }

  decide() {
    void this.log.run('chooseArchitecture()', () => {
      this.decision.set(chooseArchitecture(this.needs()));
    });
  }

  setNeed<K extends keyof ArchitectureNeeds>(
    key: K,
    value: ArchitectureNeeds[K],
  ) {
    this.needs.update((needs) => ({ ...needs, [key]: value }));
    this.decision.set(undefined);
  }

  toggleNeed(key: NeedFlag, event: Event) {
    this.setNeed(key, (event.target as HTMLInputElement).checked);
  }

  pickAvailability(event: Event) {
    this.setNeed(
      'localAvailability',
      (event.target as HTMLSelectElement)
        .value as ArchitectureNeeds['localAvailability'],
    );
  }

  setPrompt(event: Event) {
    this.prompt.set((event.target as HTMLTextAreaElement).value);
  }

  setNumber(target: 'input' | 'output' | 'requests', event: Event) {
    const value = Math.max(0, Number((event.target as HTMLInputElement).value));
    if (!Number.isFinite(value)) return;
    if (target === 'input') this.inputPrice.set(value);
    else if (target === 'output') this.outputPrice.set(value);
    else this.requestsPerMonth.set(Math.round(value));
    this.cost.set(undefined);
  }

  money(value: number): string {
    return dollars.format(value);
  }

  private refreshUsage() {
    const session = this.session();
    this.usage.set(
      session
        ? `${session.contextUsage} / ${session.contextWindow} tokens in this session's context`
        : '',
    );
  }

  ngOnDestroy() {
    this.controller?.abort();
    this.session()?.destroy();
  }
}
