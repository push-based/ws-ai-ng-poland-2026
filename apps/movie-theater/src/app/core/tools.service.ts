import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { audioPresets, searchMovies } from '@nano-cinema/catalogue';
import { CinemaService } from './cinema.service';
import { DiscoveredTool, executeDiscoveredTool, toolMetadata } from './webmcp';
interface PageTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}
interface ModelContext {
  registerTool(
    tool: PageTool,
    options?: { signal: AbortSignal },
  ): Promise<void> | void;
  unregisterTool?(name: string): void;
  getTools?(): Promise<DiscoveredTool[]>;
  executeTool?(
    tool: DiscoveredTool,
    args: Record<string, unknown> | string,
  ): Promise<unknown>;
}
function modelContext(): ModelContext | undefined {
  return (document as Document & { modelContext?: ModelContext }).modelContext;
}
@Injectable({ providedIn: 'root' })
export class ToolsService {
  readonly registered = signal(false);
  readonly discovered = signal<DiscoveredTool[]>([]);
  readonly nativeExecution = signal(false);
  readonly error = signal('');
  readonly log = signal<{ name: string; args: string; result: string }[]>([]);
  private readonly cinema = inject(CinemaService);
  private readonly controller = new AbortController();
  readonly tools: PageTool[] = [
    {
      name: 'get_screening_state',
      description:
        'Read the selected movie, playback, subtitles and audio mix.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async () => this.cinema.state(),
    },
    {
      name: 'search_movies',
      description: 'Search our three-film catalogue by title, genre or mood.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args) => {
        if (typeof args['query'] !== 'string')
          throw new Error('query must be text.');
        return searchMovies(args['query']).map(
          ({ id, title, genre, mood }) => ({ id, title, genre, mood }),
        );
      },
    },
    {
      name: 'select_movie',
      description:
        'Select a catalogue film and open the screening room. Does not start audio.',
      inputSchema: {
        type: 'object',
        properties: { movieId: { enum: ['sintel', 'bunny', 'dream'] } },
        required: ['movieId'],
        additionalProperties: false,
      },
      execute: async (args) => {
        if (typeof args['movieId'] !== 'string')
          throw new Error('movieId must be text.');
        this.cinema.select(args['movieId']);
        this.cinema.view.set('screening');
        return this.cinema.state();
      },
    },
    {
      name: 'set_audio_mix',
      description:
        'Apply bass, mid and treble gains in dB (-12 to 12), and volume (0 to 1). Changes real Web Audio filters. Audio must first be unlocked by a human play gesture.',
      inputSchema: {
        type: 'object',
        properties: {
          bass: { type: 'number', minimum: -12, maximum: 12 },
          mid: { type: 'number', minimum: -12, maximum: 12 },
          treble: { type: 'number', minimum: -12, maximum: 12 },
          volume: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['bass', 'mid', 'treble', 'volume'],
        additionalProperties: false,
      },
      execute: async (args) => {
        this.cinema.audio.apply(args);
        this.cinema.view.set('booth');
        return this.cinema.state();
      },
    },
    {
      name: 'set_subtitle_language',
      description:
        'Translate the authored English commentary captions, preserving cue timings. Prepares any required local language model.',
      inputSchema: {
        type: 'object',
        properties: { language: { enum: ['en', 'pl', 'de', 'es', 'fr'] } },
        required: ['language'],
        additionalProperties: false,
      },
      execute: async (args) => {
        if (typeof args['language'] !== 'string')
          throw new Error('language must be text.');
        await this.cinema.subtitles(args['language']);
        return this.cinema.state();
      },
    },
    {
      name: 'seek_to',
      description: 'Seek within the current 30-second excerpt.',
      inputSchema: {
        type: 'object',
        properties: { seconds: { type: 'number', minimum: 0, maximum: 30 } },
        required: ['seconds'],
        additionalProperties: false,
      },
      execute: async (args) => {
        if (typeof args['seconds'] !== 'number')
          throw new Error('seconds must be numeric.');
        this.cinema.seek(args['seconds']);
        return this.cinema.state();
      },
    },
  ];
  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller.abort());
  }
  async register() {
    const context = modelContext();
    if (!context) {
      this.error.set(
        'WebMCP is not exposed. Enable chrome://flags/#enable-webmcp-testing and relaunch Chrome. Local handler tests below remain available.',
      );
      return;
    }
    if (this.registered()) return;
    try {
      for (const tool of this.tools)
        await context.registerTool(
          { ...tool, execute: (args) => this.invoke(tool.name, args) },
          { signal: this.controller.signal },
        );
      this.registered.set(true);
      this.nativeExecution.set(
        typeof context.getTools === 'function' &&
          typeof context.executeTool === 'function',
      );
      if (context.getTools)
        this.discovered.set(toolMetadata(await context.getTools()));
      this.error.set('');
    } catch (error) {
      for (const tool of this.tools) context.unregisterTool?.(tool.name);
      this.error.set(error instanceof Error ? error.message : String(error));
    }
  }
  async invoke(name: string, args: Record<string, unknown>) {
    const tool = this.tools.find((tool) => tool.name === name);
    if (!tool) throw new Error('Unknown tool.');
    const properties = tool.inputSchema['properties'] as Record<
      string,
      unknown
    >;
    if (Object.keys(args).some((key) => !(key in properties)))
      throw new Error('Unexpected tool argument.');
    try {
      const result = await tool.execute(args);
      this.log.update((items) =>
        [
          { name, args: JSON.stringify(args), result: JSON.stringify(result) },
          ...items,
        ].slice(0, 12),
      );
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      const result = error instanceof Error ? error.message : String(error);
      this.log.update((items) =>
        [
          { name, args: JSON.stringify(args), result: `ERROR: ${result}` },
          ...items,
        ].slice(0, 12),
      );
      throw error;
    }
  }
  async invokeNative(name: string, args: Record<string, unknown>) {
    const context = modelContext();
    if (!context?.getTools || !context.executeTool)
      throw new Error(
        'Native WebMCP discovery/execution is not available in this Chrome build. Use an external inspector or local handler tests.',
      );
    const tools = await context.getTools();
    this.discovered.set(toolMetadata(tools));
    const tool = tools.find((tool) => tool.name === name);
    if (!tool) throw new Error('Tool is not registered with the browser.');
    const { result, argumentEncoding } = await executeDiscoveredTool(
      { executeTool: context.executeTool.bind(context) },
      tool,
      args,
    );
    if (argumentEncoding === 'json-string')
      this.cinema.ai.trace(
        'WebMCP',
        'legacy argument encoding',
        'JSON-string arguments required by this Chrome build',
      );
    this.cinema.ai.trace('WebMCP', 'executeTool()', name);
    return result;
  }
  async example(
    kind: 'dialogue' | 'night' | 'invalid' | 'state',
    native = false,
  ) {
    const invoke = native
      ? this.invokeNative.bind(this)
      : this.invoke.bind(this);
    return kind === 'state'
      ? invoke('get_screening_state', {})
      : invoke(
          'set_audio_mix',
          kind === 'invalid'
            ? { bass: 99, mid: 0, treble: 0, volume: 0.7 }
            : { ...audioPresets[kind] },
        );
  }
}
