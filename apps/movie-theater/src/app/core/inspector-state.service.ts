import { Injectable, signal } from '@angular/core';
/** Shared only by the application shell and the discovery page's inspect action. */
@Injectable({ providedIn: 'root' })
export class InspectorState {
  readonly open = signal(false);

  show() {
    this.open.set(true);
  }

  hide() {
    this.open.set(false);
  }
}
