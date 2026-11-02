import { Routes } from '@angular/router';
import { labExercises } from './lab.catalog';

/** /lab lists the exercises; /lab/:id opens one. Every page is lazy-loaded. */
export const labRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./lab-home/lab-home').then((m) => m.LabHome),
  },
  ...labExercises.map((exercise) => ({
    path: exercise.id,
    title: `Lab ${exercise.id.replace('-', '.')} · ${exercise.title}`,
    loadComponent:
      exercise.load ??
      (() => import('./lab-home/lab-terminal').then((m) => m.LabTerminal)),
    data: { exerciseId: exercise.id },
  })),
];
