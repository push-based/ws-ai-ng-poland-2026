import { Injectable, signal } from '@angular/core';
import {
  installSimulatedAi,
  isSimulatedAiInstalled,
  uninstallSimulatedAi,
} from './simulated-ai';

const storageKey = 'nano-cinema-lab-simulation';

/**
 * Lab-wide switch between the browser's real built-in AI and the simulation.
 * The choice is remembered per browser so a reload keeps the same mode.
 */
@Injectable({ providedIn: 'root' })
export class LabSimulation {
  readonly enabled = signal(isSimulatedAiInstalled());
  /** Whether this browser exposes the Prompt API without any simulation. */
  readonly nativePrompt = signal(
    !isSimulatedAiInstalled() && typeof LanguageModel !== 'undefined',
  );
  readonly nativeWebmcp = signal(
    typeof document !== 'undefined' &&
      'modelContext' in document &&
      !isSimulatedAiInstalled(),
  );

  constructor() {
    let remembered = false;
    try {
      remembered = localStorage.getItem(storageKey) === 'on';
    } catch {
      /* storage may be blocked; default to native */
    }
    if (remembered && !this.enabled()) this.set(true);
  }

  set(on: boolean) {
    if (on) installSimulatedAi();
    else uninstallSimulatedAi();
    this.enabled.set(on);
    try {
      localStorage.setItem(storageKey, on ? 'on' : 'off');
    } catch {
      /* storage may be blocked */
    }
  }
}
