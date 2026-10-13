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
      // The SDK uses this Zod schema to describe and validate incoming arguments.
      // A strict schema rejects extra keys; defaults/limits keep our handler focused
      // on catalogue search. readOnlyHint describes behavior, not a permission grant.
      inputSchema: z
        .object({
          query: z.string().max(200).default(''),
          audioLanguage: z.enum(['en', 'none']).optional(),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ query, audioLanguage }) => {
      // Use the same domain search as the web app. Return real catalogue metadata
      // and resource URIs, allowing a host to fetch notes for a selected film next.
      // This operation is deterministic data lookup, not model-generated search.
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
