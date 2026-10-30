import { McpServer } from '@modelcontextprotocol/server';
import { registerMovieSearch } from './tools/search-movies.js';
import { registerMovieResources } from './resources/movie-notes.js';
import { registerDiscussionPrompt } from './prompts/film-club.js';
import { registerGetMovie } from './tools/get-movie.js';
import { registerCaptionResources } from './resources/movie-captions.js';

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
  // Exercise 4.1 (workshop lab): the participant's get_movie tool and captions
  // resource template. Registered last, so search_movies stays the first tool.
  registerGetMovie(server);
  registerCaptionResources(server);
  return server;
}
