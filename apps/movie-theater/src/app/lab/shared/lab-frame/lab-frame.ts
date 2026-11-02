import {
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { findExercise, labBlocks, labExercises } from '../../lab.catalog';
import { LabLog } from '../lab-log';
import { LabSimulation } from '../simulation.service';

/**
 * Common chrome for every exercise page: title, the file to edit, links to the
 * instructions, the simulated-AI switch, the event log and previous/next links.
 * Styles are global (ViewEncapsulation.None) and prefixed with .lab so projected
 * exercise content shares them without each page repeating CSS.
 */
@Component({
  selector: 'app-lab-frame',
  imports: [RouterLink],
  templateUrl: './lab-frame.html',
  styleUrl: './lab-frame.css',
  encapsulation: ViewEncapsulation.None,
})
export class LabFrame {
  readonly exerciseId = input.required<string>();
  readonly log = input<LabLog>();
  readonly simulation = inject(LabSimulation);
  readonly blocks = labBlocks;
  readonly exercise = computed(() => {
    const exercise = findExercise(this.exerciseId());
    if (!exercise) throw new Error(`Unknown lab exercise ${this.exerciseId()}`);
    return exercise;
  });
  private readonly index = computed(() =>
    labExercises.findIndex((exercise) => exercise.id === this.exerciseId()),
  );
  readonly previous = computed(() => labExercises[this.index() - 1]);
  readonly next = computed(() => labExercises[this.index() + 1]);

  toggleSimulation(event: Event) {
    this.simulation.set((event.target as HTMLInputElement).checked);
  }
}
