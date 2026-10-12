import type { McpServer } from '@modelcontextprotocol/server';
import { movies } from '@nano-cinema/catalogue';

/** Expose curated notes as MCP resources. Reading a resource performs no inference. */
export function registerMovieResources(server: McpServer): void {
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
}
