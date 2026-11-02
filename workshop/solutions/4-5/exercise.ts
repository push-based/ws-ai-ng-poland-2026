// ─────────────────────────────────────────────────────────────────────────────
// Exercise 4.5 (bonus) · A local agent at zero token cost — SOLUTION
// Copy into place with: pnpm lab:solve 4-5
//
// The agent = the on-device Prompt API (decides) + WebMCP (acts).
// No cloud model, no API key, no token bill.
// ─────────────────────────────────────────────────────────────────────────────
import {
  executeDiscoveredTool,
  type DiscoveredTool,
} from '../../../core/webmcp/webmcp-client';

/** The part of document.modelContext the agent needs. */
export interface AgentContext {
  getTools(): Promise<DiscoveredTool[]>;
  executeTool(
    tool: DiscoveredTool,
    args: Record<string, unknown> | string,
  ): Promise<unknown>;
}

/** What one agent run did: the chosen tool ('none' = no action), its arguments and the result. */
export interface AgentRun {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

/** The agent may only use the tools of this page (exercise 4.4). */
export const watchlistToolNames = [
  'get_watchlist',
  'add_to_watchlist',
  'remove_from_watchlist',
];

export const agentOptions: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

export const agentInstruction = [
  'You route requests of a cinema website visitor to the website tools.',
  'Choose a tool only when the visitor explicitly asks for that action.',
  'A question that asks for information, not an action, needs no tool: choose "none".',
  'Never invent argument values: use only values the visitor gave.',
].join('\n');

/** Given: create the base session once (the routine from exercise 2.1). */
export async function createAgentSession(
  signal?: AbortSignal,
): Promise<LanguageModel> {
  if (typeof LanguageModel === 'undefined')
    throw new Error(
      'The Prompt API is not exposed by this browser. Open /preflight or turn on the simulation.',
    );
  if ((await LanguageModel.availability(agentOptions)) === 'unavailable')
    throw new Error('The Prompt API cannot run English text on this device.');
  return LanguageModel.create({
    ...agentOptions,
    initialPrompts: [{ role: 'system', content: agentInstruction }],
    signal,
  });
}

/** Given: the tool menu the model reads before it chooses. */
export function describeTools(tools: readonly DiscoveredTool[]): string {
  const lines = tools.map(
    (tool) => `- ${tool.name}: ${tool.description ?? ''}`,
  );
  return [
    'Available tools:',
    ...lines,
    '- none: no tool is needed, or none fits.',
  ].join('\n');
}

/** Given: getTools() may return the input schema as a JSON string. */
export function parseSchema(
  schema: DiscoveredTool['inputSchema'],
): Record<string, unknown> {
  if (typeof schema === 'string')
    return JSON.parse(schema) as Record<string, unknown>;
  return schema ?? { type: 'object', properties: {} };
}

/**
 * STEP 1 · The JSON schema of the model's choice: an object with one field,
 * `tool`, whose value must be 'none' or one of the tool names.
 */
export function choiceSchema(
  tools: readonly DiscoveredTool[],
): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      tool: {
        type: 'string',
        enum: ['none', ...tools.map((tool) => tool.name)],
      },
    },
    required: ['tool'],
    additionalProperties: false,
  };
}

/**
 * STEP 2 · Let the model choose a tool. Work in a fresh clone() of the base
 * session, so earlier requests never leak into this decision, and destroy the
 * clone afterwards. Accept only 'none' or a real tool name.
 */
export async function chooseTool(
  base: LanguageModel,
  request: string,
  tools: readonly DiscoveredTool[],
  signal?: AbortSignal,
): Promise<string> {
  const session = await base.clone({ signal });
  try {
    await session.append([{ role: 'user', content: describeTools(tools) }], {
      signal,
    });
    const answer = await session.prompt(request, {
      responseConstraint: choiceSchema(tools),
      signal,
    });
    const { tool } = JSON.parse(answer) as { tool?: unknown };
    // Structured output gives the right SHAPE. Still check the value in code.
    if (tool !== 'none' && !tools.some((candidate) => candidate.name === tool))
      throw new Error(
        `The model chose a tool that is not offered: ${String(tool)}`,
      );
    return tool as string;
  } finally {
    session.destroy();
  }
}

/**
 * STEP 3 · Let the model fill in the chosen tool's arguments. The tool's own
 * inputSchema is the responseConstraint. Again: fresh clone, destroy after.
 */
export async function extractArguments(
  base: LanguageModel,
  request: string,
  tool: DiscoveredTool,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const schema = parseSchema(tool.inputSchema);
  // A tool without parameters (get_watchlist) needs no model call at all.
  if (!Object.keys((schema['properties'] as object | undefined) ?? {}).length)
    return {};
  const session = await base.clone({ signal });
  try {
    await session.append(
      [
        {
          role: 'user',
          content: `Fill in the arguments of the tool "${tool.name}" (${tool.description ?? ''}). Use only values from the request.`,
        },
      ],
      { signal },
    );
    const answer = await session.prompt(request, {
      responseConstraint: schema,
      signal,
    });
    const args = JSON.parse(answer) as unknown;
    if (!args || typeof args !== 'object' || Array.isArray(args))
      throw new Error('The model did not return an arguments object.');
    return args as Record<string, unknown>;
  } finally {
    session.destroy();
  }
}

/**
 * STEP 4 · One agent run: discover → choose → (stop on 'none') → extract →
 * execute ONCE through the browser. Never loop and never ask the model again
 * after the action: the application decides when the work is done.
 */
export async function runAgent(
  request: string,
  context: AgentContext,
  base: LanguageModel,
  signal?: AbortSignal,
  allowed: readonly string[] = watchlistToolNames,
): Promise<AgentRun> {
  signal?.throwIfAborted();
  // Least privilege: offer the model only this page's tools.
  const tools = (await context.getTools()).filter((tool) =>
    allowed.includes(tool.name),
  );
  if (!tools.length) throw new Error('No watchlist tools are registered yet.');
  const choice = await chooseTool(base, request, tools, signal);
  if (choice === 'none') return { tool: 'none', args: {}, result: null };
  const tool = tools.find((candidate) => candidate.name === choice);
  if (!tool) throw new Error(`Unknown tool: ${choice}`);
  const args = await extractArguments(base, request, tool, signal);
  signal?.throwIfAborted();
  // Execute exactly once. The tool's execute() validates args (exercise 4.4).
  const { result } = await executeDiscoveredTool(context, tool, args);
  return { tool: tool.name, args, result };
}
