import type { CinemaService } from '../../cinema.service';
import type { PageTool } from '../tool.types';
// A tool can be asynchronous: subtitle translation may prepare a model and
// run inference. Forward the caller's AbortSignal through the feature pipeline
// so cancelling that tool call can cancel the work, not just its UI response.
export function screeningTools(cinema: CinemaService): PageTool[] {
  return [
    {
      name: 'set_subtitle_language',
      description:
        'Translate the sourced English dialogue subtitles, preserving cue timings. Prepares any required local language model.',
      inputSchema: {
        type: 'object',
        properties: { language: { enum: ['en', 'pl', 'de', 'es', 'fr'] } },
        required: ['language'],
        additionalProperties: false,
      },
      execute: async (args, signal) => {
        if (typeof args['language'] !== 'string')
          throw new Error('language must be text.');
        await cinema.subtitles(args['language'], signal);
        return cinema.state();
      },
    },
    {
      name: 'seek_to',
      description: 'Seek within the current 30-second excerpt.',
      inputSchema: {
        type: 'object',
        properties: { seconds: { type: 'number', minimum: 0, maximum: 30 } },
        required: ['seconds'],
        additionalProperties: false,
      },
      execute: async (args) => {
        if (typeof args['seconds'] !== 'number')
          throw new Error('seconds must be numeric.');
        cinema.seek(args['seconds']);
        return cinema.state();
      },
    },
  ];
}
