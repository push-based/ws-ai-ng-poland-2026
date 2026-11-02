import { Component, OnDestroy, signal } from '@angular/core';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  type ModelStatus,
  checkModel,
  describeAvailability,
  prepareModel,
  releaseModel,
} from './exercise';

/** Ready-made UI for exercise 1.3. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-model-download',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabModelDownload implements OnDestroy {
  readonly log = new LabLog();
  readonly status = signal<ModelStatus | undefined>(undefined);
  readonly description = signal('');
  readonly progress = signal<number | undefined>(undefined);
  readonly preparing = signal(false);
  readonly session = signal<LanguageModel | undefined>(undefined);
  private controller?: AbortController;

  async check() {
    const status = await this.log.run('checkModel()', () => checkModel());
    if (!status) return;
    this.status.set(status);
    await this.log.run('describeAvailability()', () => {
      this.description.set(describeAvailability(status));
    });
  }

  async prepare() {
    // A click is a user activation. Chrome needs one to start a model download.
    const activation =
      typeof navigator !== 'undefined' && navigator.userActivation
        ? navigator.userActivation.isActive
        : undefined;
    this.log.info(
      `User activation while starting: ${activation ?? 'not reported by this browser'}`,
    );
    const controller = new AbortController();
    this.controller = controller;
    this.preparing.set(true);
    this.progress.set(undefined);
    const session = await this.log.run('prepareModel()', () =>
      prepareModel((loaded) => {
        if (!controller.signal.aborted) this.progress.set(loaded);
      }, controller.signal),
    );
    this.preparing.set(false);
    if (session) {
      this.session.set(session);
      this.log.ok(
        `Session ready: ${session.contextUsage} / ${session.contextWindow} tokens in context.`,
      );
    }
    await this.check();
  }

  cancel() {
    this.controller?.abort();
  }

  release() {
    void this.log.run('releaseModel()', () => {
      releaseModel(this.session());
      this.session.set(undefined);
      this.progress.set(undefined);
    });
  }

  percent(loaded: number): number {
    return Math.round(Math.min(1, Math.max(0, loaded)) * 100);
  }

  ngOnDestroy() {
    this.controller?.abort();
    try {
      releaseModel(this.session());
    } catch {
      /* Step 5 not done yet: fall back to destroying the session here. */
      this.session()?.destroy();
    }
  }
}
