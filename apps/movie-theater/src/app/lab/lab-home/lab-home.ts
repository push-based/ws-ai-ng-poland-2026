import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LabExercise, labBlocks, labExercises } from '../lab.catalog';
import { LabSimulation } from '../shared/simulation.service';

/** The lab's start page: every exercise grouped by the workshop agenda blocks. */
@Component({
  selector: 'app-lab-home',
  imports: [RouterLink],
  templateUrl: './lab-home.html',
  styleUrl: './lab-home.css',
})
export class LabHome {
  readonly simulation = inject(LabSimulation);
  readonly groups = ([1, 2, 3, 4] as const).map((block) => ({
    block,
    title: labBlocks[block],
    exercises: labExercises.filter((exercise) => exercise.block === block),
  }));

  label(exercise: LabExercise) {
    return exercise.id.replace('-', '.');
  }

  toggleSimulation(event: Event) {
    this.simulation.set((event.target as HTMLInputElement).checked);
  }
}
