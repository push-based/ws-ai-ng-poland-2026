import type { Router } from '@angular/router';
import type { CinemaService } from '../../cinema.service';
import type { PageTool } from '../tool.types';
// This is the main imperative WebMCP demonstration: an agent calls a domain
// operation that changes Web Audio filters, rather than filling out a form.
// A human still needs to unlock playback/audio with a gesture first.
export function audioTools(cinema: CinemaService, router: Router): PageTool[] {
  return [
    {
      name: 'set_audio_mix',
      description:
        'Apply bass, mid and treble gains in dB (-12 to 12), and volume (0 to 1). Changes real Web Audio filters. Audio must first be unlocked by a human play gesture.',
      inputSchema: {
        type: 'object',
        properties: {
          bass: {
            type: 'number',
            minimum: -12,
            maximum: 12,
            description:
              'Bass shelf gain in dB. Reject out-of-range requests; never substitute a different value.',
          },
          mid: {
            type: 'number',
            minimum: -12,
            maximum: 12,
            description:
              'Midrange peak gain in dB. Use the explicitly requested value.',
          },
          treble: {
            type: 'number',
            minimum: -12,
            maximum: 12,
            description:
              'Treble shelf gain in dB. Use the explicitly requested value.',
          },
          volume: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description:
              'Linear master gain from 0 to 1; 70 percent is 0.7. Does not unlock playback.',
          },
        },
        required: ['bass', 'mid', 'treble', 'volume'],
        additionalProperties: false,
      },
      execute: async (args) => {
        cinema.audio.apply(args);
        await router.navigate(['/movies', cinema.movieId()], {
          queryParams: { panel: 'sound' },
        });
        return cinema.state();
      },
    },
  ];
}
