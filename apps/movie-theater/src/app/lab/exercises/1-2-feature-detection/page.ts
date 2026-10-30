import { Component, signal } from '@angular/core';
import { LabFrame } from '../../shared/lab-frame/lab-frame';
import { LabLog } from '../../shared/lab-log';
import {
  type ApiCheck,
  aiGlobals,
  checkAll,
  checkApi,
  isExposed,
} from './exercise';

interface ExposedRow {
  name: string;
  exposed: boolean;
}

/** Ready-made UI for exercise 1.2. Participants edit exercise.ts, not this file. */
@Component({
  selector: 'app-lab-feature-detection',
  imports: [LabFrame],
  templateUrl: './page.html',
})
export class LabFeatureDetection {
  readonly log = new LabLog();
  readonly exposed = signal<ExposedRow[]>([]);
  readonly demoRow = signal<ApiCheck | undefined>(undefined);
  readonly rows = signal<ApiCheck[]>([]);
  readonly languages = [
    { code: 'en', name: 'English' },
    { code: 'pl', name: 'Polish' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'ja', name: 'Japanese' },
    { code: 'uk', name: 'Ukrainian' },
  ];
  readonly source = signal('en');
  readonly target = signal('pl');
  readonly legend: { state: ApiCheck['status']; text: string }[] = [
    {
      state: 'available',
      text: 'The model is on this device. create() starts quickly.',
    },
    {
      state: 'downloadable',
      text: 'The device can run it, but the model must be downloaded first. create() starts the download and needs a click.',
    },
    {
      state: 'downloading',
      text: 'A download for this model is already in progress.',
    },
    {
      state: 'unavailable',
      text: 'The API exists, but not for these options on this device (language, modality or hardware).',
    },
    {
      state: 'missing',
      text: 'This browser does not expose the API at all (our own state, from feature detection).',
    },
    {
      state: 'error',
      text: 'The check itself threw. The message is shown instead of the description (our own state).',
    },
  ];

  checkGlobals() {
    void this.log.run('isExposed()', () => {
      this.exposed.set(
        aiGlobals.map((name) => ({ name, exposed: isExposed(name) })),
      );
    });
  }

  async tryFailingCheck() {
    const row = await this.log.run('checkApi() with a failing check', () =>
      checkApi('LanguageModel', 'A check that always throws (demo)', () =>
        Promise.reject(new Error('Demo failure: this check always throws.')),
      ),
    );
    if (row) this.demoRow.set(row);
  }

  async runAll() {
    const rows = await this.log.run(
      `checkAll('${this.source()}', '${this.target()}')`,
      () => checkAll(this.source(), this.target()),
    );
    if (rows) this.rows.set(rows);
  }

  pick(which: 'source' | 'target', event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    (which === 'source' ? this.source : this.target).set(value);
  }
}
