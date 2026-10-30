/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the imports and parameter are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4.1 · Exposing catalogue data from an MCP server (part 1: a tool)
// Guide: workshop/exercises/4-1-cinema-mcp-server.md
//
// You edit THIS file and resources/movie-captions.ts. server.ts already calls
// registerGetMovie(server). Replace each `// TODO Step n` line with your code.
// Check your work: pnpm lab:check 4-1   (it rebuilds the server first)
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
  // TODO Step 1: call server.registerTool('get_movie', { …metadata… }, handler).
}
