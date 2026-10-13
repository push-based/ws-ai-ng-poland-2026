import type { Router } from '@angular/router';
import type { CinemaService } from '../../cinema.service';
import type { PageTool } from '../tool.types';
import { searchMovies } from '@nano-cinema/catalogue';
// Distinguish inspection/search (read-only hints) from movie selection (changes
// page state). Descriptions and schemas help a caller choose the right operation;
// selection opens the route but deliberately does not attempt autoplay.
export function catalogueTools(
  cinema: CinemaService,
  router: Router,
): PageTool[] {
  return [
    {
      name: 'get_screening_state',
      description:
        'Read the selected movie, playback, subtitles and audio mix.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async () => cinema.state(),
    },
    {
      name: 'search_movies',
      description: 'Search our three-film catalogue by title, genre or mood.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args) => {
        if (typeof args['query'] !== 'string')
          throw new Error('query must be text.');
        return searchMovies(args['query']).map(
          ({ id, title, genre, mood }) => ({ id, title, genre, mood }),
        );
      },
    },
    {
      name: 'select_movie',
      description:
        'Select a catalogue film and open the screening room. Does not start audio.',
      inputSchema: {
        type: 'object',
        properties: { movieId: { enum: ['sintel', 'bunny', 'dream'] } },
        required: ['movieId'],
        additionalProperties: false,
      },
      execute: async (args) => {
        if (typeof args['movieId'] !== 'string')
          throw new Error('movieId must be text.');
        cinema.select(args['movieId']);
        await router.navigate(['/movies', args['movieId']]);
        return cinema.state();
      },
    },
  ];
}
