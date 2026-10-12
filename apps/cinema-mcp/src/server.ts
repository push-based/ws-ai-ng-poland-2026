import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { movies, getMovie, searchMovies } from '@nano-cinema/catalogue';
/** A read-only MCP companion. Page playback and audio stay in WebMCP. */
export function createCinemaServer(): McpServer {
  const server = new McpServer({ name: 'nano-cinema', version: '1.0.0' });
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
  for (const movie of movies)
    server.registerResource(
      `${movie.id}_notes`,
      `cinema://movies/${movie.id}`,
      {
        title: `${movie.title} programme notes`,
        description:
          'Curated notes, source attribution and workshop commentary captions.',
        mimeType: 'application/json',
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(movie),
          },
        ],
      }),
    );
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
  return server;
}
