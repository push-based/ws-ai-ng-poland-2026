import { McpServer } from '@modelcontextprotocol/server';
import { registerMovieSearch } from './tools/search-movies.js';
import { registerMovieResources } from './resources/movie-notes.js';
import { registerDiscussionPrompt } from './prompts/film-club.js';

/** Composition root: the stdio entry owns transport; each module registers one MCP capability. */
// MCP's three capability types demonstrate different roles: a tool performs
// a callable operation, a resource supplies identified content, and a prompt
// supplies reusable messages. The host/client chooses how to use them; this
// server itself neither runs inference nor hosts the Angular player.
export function createCinemaServer(): McpServer {
  const server = new McpServer({ name: 'nano-cinema', version: '1.0.0' });
  registerMovieSearch(server);
  registerMovieResources(server);
  registerDiscussionPrompt(server);
  return server;
}
