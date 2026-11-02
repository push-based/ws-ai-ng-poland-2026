import { Component, computed, input } from '@angular/core';
import { findExercise } from '../lab.catalog';
import { LabFrame } from '../shared/lab-frame/lab-frame';

/** Placeholder page for exercises that run in a terminal (MCP server and client). */
@Component({
  selector: 'app-lab-terminal',
  imports: [LabFrame],
  templateUrl: './lab-terminal.html',
})
export class LabTerminal {
  /** Bound from the route's data by withComponentInputBinding(). */
  readonly exerciseId = input.required<string>();
  readonly commands = computed(
    () => findExercise(this.exerciseId())?.commands ?? [],
  );
}
