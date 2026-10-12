import type { DiscoveredTool } from './webmcp-client';
export interface PageTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<unknown>;
}
interface NativePageTool extends Omit<PageTool, 'execute'> {
  execute: (
    args: Record<string, unknown>,
    context?: { signal: AbortSignal },
  ) => Promise<unknown>;
}
export interface ModelContext {
  registerTool(
    tool: NativePageTool,
    options?: { signal: AbortSignal },
  ): Promise<void> | void;
  unregisterTool?(name: string): void;
  getTools?(): Promise<DiscoveredTool[]>;
  executeTool?(
    tool: DiscoveredTool,
    args: Record<string, unknown> | string,
  ): Promise<unknown>;
}
