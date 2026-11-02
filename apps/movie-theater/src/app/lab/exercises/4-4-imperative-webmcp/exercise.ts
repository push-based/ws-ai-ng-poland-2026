/* eslint-disable @typescript-eslint/no-unused-vars -- starter code: the parameters are used once you complete the TODOs */
// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4.4 · Imperative WebMCP
// Guide: workshop/exercises/4-4-imperative-webmcp.md
//
// You only edit THIS file. The page at http://127.0.0.1:4200/lab/4-4 is ready
// and calls the functions below. Replace each `todo(...)` line with your code.
// Check your work: pnpm lab:check 4-4
// ─────────────────────────────────────────────────────────────────────────────
import { movies } from '@nano-cinema/catalogue';
import type { DiscoveredTool } from '../../../core/webmcp/webmcp-client';
import { todo } from '../../shared/todo';

/** The only ids a tool may accept: the real catalogue. */
export const movieIds = movies.map((movie) => movie.id);

/** What every execute() returns: structured content with a JSON text payload. */
export interface ToolResult {
  content: { type: 'text'; text: string }[];
}

/** One imperative WebMCP tool, as passed to document.modelContext.registerTool(). */
export interface WatchlistTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (
    args: Record<string, unknown>,
    context?: { signal?: AbortSignal },
  ) => Promise<ToolResult>;
}

/** The part of document.modelContext this exercise uses. */
export interface ModelContextLike {
  registerTool(
    tool: WatchlistTool,
    options?: { signal?: AbortSignal },
  ): Promise<void> | void;
  getTools?(): Promise<DiscoveredTool[]>;
  executeTool?(
    tool: DiscoveredTool,
    args: Record<string, unknown> | string,
  ): Promise<unknown>;
}

/** Given: a tiny in-memory watchlist. Humans (buttons) and agents (tools) use the same methods. */
export class Watchlist {
  private readonly ids: string[] = [];

  constructor(
    private readonly onChange: (ids: readonly string[]) => void = () =>
      undefined,
  ) {}

  list(): { id: string; title: string }[] {
    return this.ids.map((id) => ({
      id,
      title: movies.find((movie) => movie.id === id)?.title ?? id,
    }));
  }

  /** Returns false when the film was already on the list. */
  add(movieId: string): boolean {
    if (this.ids.includes(movieId)) return false;
    this.ids.push(movieId);
    this.onChange([...this.ids]);
    return true;
  }

  /** Returns false when the film was not on the list. */
  remove(movieId: string): boolean {
    const index = this.ids.indexOf(movieId);
    if (index < 0) return false;
    this.ids.splice(index, 1);
    this.onChange([...this.ids]);
    return true;
  }
}

/** Given: the input schema of add_to_watchlist and remove_from_watchlist. */
export const movieIdSchema = {
  type: 'object',
  properties: {
    movieId: {
      type: 'string',
      enum: movieIds,
      description:
        'Catalogue id: sintel (Sintel), bunny (Big Buck Bunny) or dream (Elephants Dream).',
    },
  },
  required: ['movieId'],
  additionalProperties: false,
};

/** Given: wrap a plain value as a tool result, like core/webmcp/webmcp.service.ts does. */
export function toolResult(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

/**
 * STEP 1 · Find WebMCP. It lives on `document.modelContext` (not on
 * `navigator`). Return undefined when it is missing, also outside a browser.
 */
export function getModelContext(): ModelContextLike | undefined {
  // TODO Step 1: return document.modelContext, or undefined.
  return todo('4-4', 'Step 1 (getModelContext)');
}

/**
 * STEP 2 · Validate the arguments of add/remove in code. The input schema is a
 * contract for the agent, NOT validation: a caller can send anything.
 * Accept exactly { movieId } with a real catalogue id; throw an Error otherwise.
 */
export function readMovieId(args: unknown): string {
  // TODO Step 2: check the object, reject unknown keys, check the id, return it.
  return todo('4-4', 'Step 2 (readMovieId)');
}

/**
 * STEP 3 · Describe three tools: get_watchlist (read-only), add_to_watchlist
 * and remove_from_watchlist. Each execute() validates its arguments itself and
 * returns toolResult({...}).
 */
export function watchlistTools(watchlist: Watchlist): WatchlistTool[] {
  // TODO Step 3: return [getWatchlist, addToWatchlist, removeFromWatchlist].
  return todo('4-4', 'Step 3 (watchlistTools)');
}

/**
 * STEP 4 · Register every tool with the same AbortSignal. Aborting that signal
 * later unregisters all of them at once (for example when the page closes).
 */
export async function registerAll(
  context: ModelContextLike,
  tools: WatchlistTool[],
  signal: AbortSignal,
): Promise<void> {
  // TODO Step 4: await context.registerTool(tool, { signal }) for each tool.
  return todo('4-4', 'Step 4 (registerAll)');
}
