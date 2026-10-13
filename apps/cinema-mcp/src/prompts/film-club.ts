import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getMovie } from '@nano-cinema/catalogue';

/** Return reusable instructions, not a generated model response. */
export function registerDiscussionPrompt(server: McpServer): void {
  server.registerPrompt(
    'film_club_discussion',
    {
      title: 'Prepare a film-club discussion',
      description:
        'A reusable grounded discussion prompt. Returns instructions, does not itself run a model.',
      argsSchema: z
        .object({ movieId: z.enum(['sintel', 'bunny', 'dream']) })
        .strict(),
    },
    // getPrompt returns a message template filled with grounded notes. It does
    // not answer the discussion questions. A host can review these messages and
    // then pass them to its own model as a separate inference step.
    ({ movieId }) => {
      const movie = getMovie(movieId);
      return {
        description: `Discuss ${movie.title}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Create three discussion questions using only these programme notes. Distinguish observable details from speculation. Do not invent plot details or reveal an ending.\n\n${movie.notes.join('\n\n')}`,
            },
          },
        ],
      };
    },
  );
}
