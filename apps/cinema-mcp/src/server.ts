import { McpServer } from '@modelcontextprotocol/server';
import { registerMovieSearch } from './tools/search-movies.js';
import { registerMovieResources } from './resources/movie-notes.js';
import { registerDiscussionPrompt } from './prompts/film-club.js';

/** Composition root: the stdio entry owns transport; each module registers one MCP capability. */
export function createCinemaServer(): McpServer {
  const server = new McpServer({ name: 'nano-cinema', version: '1.0.0' });
  registerMovieSearch(server);
  registerMovieResources(server);
  registerDiscussionPrompt(server);
  return server;
}
