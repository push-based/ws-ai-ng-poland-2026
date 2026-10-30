/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the imports and parameter are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4.1 · Exposing catalogue data from an MCP server (part 2: a resource template)
// Guide: workshop/exercises/4-1-cinema-mcp-server.md
//
// server.ts already calls registerCaptionResources(server).
// Replace each `// TODO Step n` line with your code.
// Check your work: pnpm lab:check 4-1
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
  // TODO Step 3: create a ResourceTemplate and call server.registerResource(…).
}
