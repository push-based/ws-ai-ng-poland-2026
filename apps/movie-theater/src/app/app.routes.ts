import { Routes } from '@angular/router';

/** Load page code when navigating. The optional detector runtime is loaded only when explicitly enabled. */
export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/discover/discover').then((module) => module.Discover),
    pathMatch: 'full',
  },
  {
    path: 'movies/:id',
    loadComponent: () =>
      import('./features/screening/screening').then(
        (module) => module.Screening,
      ),
  },
  { path: '**', redirectTo: '' },
];
