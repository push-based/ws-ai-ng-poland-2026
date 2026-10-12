import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { searchMovies } from '@nano-cinema/catalogue';

/** Read-only catalogue search; the shared domain enforces real film IDs. */
export function registerMovieSearch(server: McpServer): void {
  server.registerTool(
    'search_movies',
    {
      title: 'Search the cinema catalogue',
      description:
        'Find local open movies by title, genre or mood. Returns catalogue metadata, never invented titles.',
      inputSchema: z
        .object({
          query: z.string().max(200).default(''),
          audioLanguage: z.enum(['en', 'none']).optional(),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ query, audioLanguage }) => {
      const matches = searchMovies(query, audioLanguage).map(
        ({ id, title, year, genre, mood, description, audioLanguage }) => ({
          id,
          title,
          year,
          genre,
          mood,
          description,
          audioLanguage,
          notesUri: `cinema://movies/${id}`,
        }),
      );
      return { content: [{ type: 'text', text: JSON.stringify(matches) }] };
    },
  );
}
