// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4.1 · Exposing catalogue data from an MCP server (part 1: a tool) — SOLUTION
// Copy into place with: pnpm lab:solve 4-1
//
// Never use console.log in this server: stdout carries the MCP protocol.
// ─────────────────────────────────────────────────────────────────────────────
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getMovie } from '@nano-cinema/catalogue';

/**
 * STEP 1 · Register a tool called `get_movie`.
 * Give it a title, a description the host's model can read, a strict Zod
 * input schema with one `movieId` field (sintel, bunny or dream) and the
 * annotation readOnlyHint: true.
 *
 * STEP 2 · Write the handler: look the film up with getMovie(movieId) and
 * return its facts as JSON text.
 */
export function registerGetMovie(server: McpServer): void {
  server.registerTool(
    'get_movie',
    {
      title: 'Get one movie',
      description:
        'Return the catalogue facts of one film by its id: sintel, bunny or dream. Use search_movies first if you do not know the id.',
      // The SDK turns this Zod schema into the JSON Schema the host sees, and
      // validates every call against it before our handler runs.
      inputSchema: z
        .object({ movieId: z.enum(['sintel', 'bunny', 'dream']) })
        .strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ movieId }) => {
      const { id, title, year, director, genre, mood, description, license } =
        getMovie(movieId);
      const facts = {
        id,
        title,
        year,
        director,
        genre,
        mood,
        description,
        license,
        notesUri: `cinema://movies/${id}`,
      };
      return { content: [{ type: 'text', text: JSON.stringify(facts) }] };
    },
  );
}
