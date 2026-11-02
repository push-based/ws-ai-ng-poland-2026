// Page helpers shared by the WebMCP lab pages (4.3, 4.4 and 4.5). Participants do
// not edit this file. It plays the role of "the browser's agent" for the buttons:
// discover the registered tools and execute one, exactly as DevTools would.
import {
  executeDiscoveredTool,
  toolMetadata,
  type DiscoveredTool,
} from '../../core/webmcp/webmcp-client';
import { SimulatedModelContext } from '../shared/simulated-ai';

export interface BrowserModelContext extends EventTarget {
  getTools?(): Promise<DiscoveredTool[]>;
  executeTool?(
    tool: DiscoveredTool,
    args: Record<string, unknown> | string,
  ): Promise<unknown>;
}

export type WebmcpMode = 'native' | 'simulated' | 'missing';

/** The page's own look at document.modelContext (independent of the exercise steps). */
export function browserModelContext(): BrowserModelContext | undefined {
  if (typeof document === 'undefined') return undefined;
  return (document as Document & { modelContext?: BrowserModelContext })
    .modelContext;
}

export function webmcpMode(): WebmcpMode {
  const context = browserModelContext();
  if (!context) return 'missing';
  return context instanceof SimulatedModelContext ? 'simulated' : 'native';
}

export const missingWebmcp =
  'document.modelContext is missing. Turn on "Use simulated browser AI" above, or enable chrome://flags/#enable-webmcp-testing and relaunch Chrome.';

/** getTools(), reduced to serializable metadata for display. */
export async function discoverTools(): Promise<DiscoveredTool[]> {
  const context = browserModelContext();
  if (!context?.getTools) throw new Error(missingWebmcp);
  return toolMetadata(await context.getTools());
}

/**
 * Find a tool by name in getTools() and run it with executeTool(). Object
 * arguments first; the JSON-string retry happens only on the known
 * pre-execution parser error of older Chrome builds (see webmcp-client.ts).
 */
export async function executeByName(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const context = browserModelContext();
  if (!context?.getTools || !context.executeTool)
    throw new Error(missingWebmcp);
  const tool = (await context.getTools()).find(
    (candidate) => candidate.name === name,
  );
  if (!tool)
    throw new Error(`The browser does not list a tool named "${name}" yet.`);
  const { result } = await executeDiscoveredTool(
    { executeTool: context.executeTool.bind(context) },
    tool,
    args,
  );
  return result;
}

/** Show a tool result as readable text: unwrap { content: [{ type: 'text', text }] }. */
export function describeResult(result: unknown): string {
  const content = (
    result as { content?: { type?: string; text?: string }[] } | null
  )?.content;
  const text = Array.isArray(content)
    ? content.find((item) => item.type === 'text')?.text
    : undefined;
  if (text !== undefined) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
  return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}

export function schemaText(schema: DiscoveredTool['inputSchema']): string {
  if (typeof schema !== 'string') return JSON.stringify(schema ?? {}, null, 2);
  try {
    return JSON.stringify(JSON.parse(schema), null, 2);
  } catch {
    return schema;
  }
}
