/** Small compatibility boundary for the evolving browser API. */
export interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  [key: string]: unknown;
}
export interface NativeToolExecutor {
  executeTool(
    tool: DiscoveredTool,
    args: Record<string, unknown> | string,
  ): Promise<unknown>;
}
// Experimental builds differ in argument encoding. Try an object first and
// retry a JSON string only for the known pre-execution parser error. Retrying
// an action after its handler ran could apply a side effect twice.
export async function executeDiscoveredTool(
  context: NativeToolExecutor,
  tool: DiscoveredTool,
  args: Record<string, unknown>,
): Promise<{ result: unknown; argumentEncoding: 'object' | 'json-string' }> {
  try {
    return {
      result: await context.executeTool(tool, args),
      argumentEncoding: 'object',
    };
  } catch (error) {
    // Before Chrome 155 the parser expects a JSON string. Its parsing failure
    // happens before execution. Never retry a handler/side-effect failure.
    if (
      !(error instanceof Error) ||
      !/Failed to parse input arguments/i.test(error.message)
    )
      throw error;
    return {
      result: await context.executeTool(tool, JSON.stringify(args)),
      argumentEncoding: 'json-string',
    };
  }
}
export function toolMetadata(tools: DiscoveredTool[]): DiscoveredTool[] {
  // Native descriptors can contain Window objects. Keep only serializable
  // metadata for the Lens; execution must use the original browser descriptor.
  return tools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
}
