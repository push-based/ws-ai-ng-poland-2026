import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { ModelContext } from './tool.types';
import { catalogueTools } from './tools/catalogue.tools';
import { audioTools } from './tools/audio.tools';
import { screeningTools } from './tools/screening.tools';

import { CinemaService } from '../cinema.service';
import {
  DiscoveredTool,
  executeDiscoveredTool,
  toolMetadata,
} from './webmcp-client';
function modelContext(): ModelContext | undefined {
  return (document as Document & { modelContext?: ModelContext }).modelContext;
}
@Injectable({ providedIn: 'root' })
export class WebmcpService {
  readonly registered = signal(false);
  readonly discovered = signal<DiscoveredTool[]>([]);
  readonly nativeExecution = signal(false);
  readonly error = signal('');
  readonly log = signal<{ name: string; args: string; result: string }[]>([]);
  private readonly cinema = inject(CinemaService);
  private readonly router = inject(Router);
  private readonly controller = new AbortController();
  // WebMCP exposes operations inside the running page. These handlers access
  // the live player/audio state. The separate Node MCP companion only exposes
  // catalogue information and cannot control this page's audio graph.
  readonly tools = [
    ...catalogueTools(this.cinema, this.router),
    ...audioTools(this.cinema, this.router),
    ...screeningTools(this.cinema),
  ];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller.abort());
  }

  /** Register domain operations once and unregister them with the Angular injection lifecycle. */
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
      // Registration makes capabilities discoverable; it does not run an agent or
      // call a language model. Route native executions through invoke() so a real
      // browser call and the local example button share validation and logging.
      for (const tool of this.tools)
        await context.registerTool(
          {
            ...tool,
            execute: (args, context) =>
              this.invoke(tool.name, args, context?.signal),
          },
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

  /** Direct UI calls and native agent calls share validation, execution and the same state transition. */
  async invoke(
    name: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ) {
    const tool = this.tools.find((tool) => tool.name === name);
    if (!tool) throw new Error('Unknown tool.');
    const properties = tool.inputSchema['properties'] as Record<
      string,
      unknown
    >;
    // Reject unknown properties at the dispatch boundary. Each operation then
    // checks required values/types/ranges in its handler or the shared domain method.
    // Tool metadata alone is not an authorization or input-validation mechanism.
    if (Object.keys(args).some((key) => !(key in properties)))
      throw new Error('Unexpected tool argument.');
    try {
      const result = await tool.execute(args, signal);
      this.log.update((items) =>
        [
          { name, args: JSON.stringify(args), result: JSON.stringify(result) },
          ...items,
        ].slice(0, 12),
      );
      // Return structured tool-result content, with a JSON text payload describing
      // the actual outcome. This is evidence for the caller, not a model-written reply.
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
    // Exercise browser discovery/execution rather than calling our handler directly.
    // Use the descriptor returned by this browser for execution; the Inspector holds
    // only a serializable metadata copy. No agent inference happens in this method.
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
      this.cinema.runtime.trace(
        'WebMCP',
        'legacy argument encoding',
        'JSON-string arguments required by this Chrome build',
      );
    this.cinema.runtime.trace('WebMCP', 'executeTool()', name);
    return result;
  }
}
