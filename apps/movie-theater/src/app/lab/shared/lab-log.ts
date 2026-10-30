import { signal } from '@angular/core';
import { isTodo } from './todo';

export interface LabLogEntry {
  kind: 'info' | 'ok' | 'error' | 'todo';
  text: string;
  time: string;
}

/**
 * A small event log for one exercise page. run() wraps a participant function:
 * unfinished steps (TodoError), cancellations and real errors are all shown as
 * log lines, so the page never crashes while the exercise is in progress.
 */
export class LabLog {
  readonly entries = signal<LabLogEntry[]>([]);
  readonly busy = signal(false);

  add(kind: LabLogEntry['kind'], text: string) {
    this.entries.update((entries) =>
      [{ kind, text, time: new Date().toLocaleTimeString() }, ...entries].slice(
        0,
        30,
      ),
    );
  }

  info(text: string) {
    this.add('info', text);
  }

  ok(text: string) {
    this.add('ok', text);
  }

  clear() {
    this.entries.set([]);
  }

  async run<T>(
    label: string,
    work: () => Promise<T> | T,
  ): Promise<T | undefined> {
    this.busy.set(true);
    this.info(`${label}…`);
    try {
      const result = await work();
      this.ok(`${label}: done`);
      return result;
    } catch (error) {
      if (isTodo(error)) this.add('todo', error.message);
      else if (error instanceof DOMException && error.name === 'AbortError')
        this.info(`${label}: cancelled`);
      else
        this.add(
          'error',
          `${label}: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
        );
      return undefined;
    } finally {
      this.busy.set(false);
    }
  }
}
