// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4.1 · Exposing catalogue data from an MCP server (part 2: a resource template) — SOLUTION
// Copy into place with: pnpm lab:solve 4-1
// ─────────────────────────────────────────────────────────────────────────────
import {
  ResourceNotFoundError,
  ResourceTemplate,
  type McpServer,
} from '@modelcontextprotocol/server';
import { movies } from '@nano-cinema/catalogue';

/**
 * STEP 3 · Register ONE resource template for every film's captions:
 * cinema://movies/{movieId}/captions. `{movieId}` is a variable, so one
 * registration answers cinema://movies/sintel/captions, …/dream/captions, …
 *
 * STEP 4 · Write the read callback: find the film by the `movieId` variable,
 * return its caption cues as JSON, and report an unknown id as an error.
 */
export function registerCaptionResources(server: McpServer): void {
  // `list: undefined` = we do not enumerate every URI in resources/list.
  // Clients discover the pattern through resources/templates/list instead.
  const template = new ResourceTemplate('cinema://movies/{movieId}/captions', {
    list: undefined,
  });
  server.registerResource(
    'movie_captions',
    template,
    {
      title: 'Movie dialogue captions',
      description:
        'Timed dialogue cues of one film: start and end are seconds in the 30-second excerpt. Big Buck Bunny has no dialogue, so its list is empty.',
      mimeType: 'application/json',
    },
    async (uri, { movieId }) => {
      // A URI-template variable can be a list; ours is always a single id.
      const id = Array.isArray(movieId) ? movieId[0] : movieId;
      const movie = movies.find((candidate) => candidate.id === id);
      if (!movie)
        throw new ResourceNotFoundError(uri.href, `Unknown movie: ${id}`);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              movieId: movie.id,
              title: movie.title,
              cues: movie.captions,
            }),
          },
        ],
      };
    },
  );
}
