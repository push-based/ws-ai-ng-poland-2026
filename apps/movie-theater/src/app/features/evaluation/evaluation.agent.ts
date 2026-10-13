import type { DiscoveredTool } from '../../core/webmcp/webmcp-client';

// Extract one tool's parameters as a simple typed object. The selected tool name
// belongs to the application, so this response cannot invent another operation.
// Required fields and ranges are checked before execution; empty arguments remain
// possible when the model correctly refuses an invalid or unrequested operation.
export function parameterSchema(tool: DiscoveredTool) {
  const schema =
    typeof tool.inputSchema === 'string'
      ? JSON.parse(tool.inputSchema)
      : tool.inputSchema;
  const properties: Record<string, unknown> = {};
  for (const [name, input] of Object.entries(schema?.['properties'] ?? {})) {
    const field = input as Record<string, unknown>;
    properties[name] = {
      type:
        field['type'] ??
        (typeof (field['enum'] as unknown[] | undefined)?.[0] === 'number'
          ? 'number'
          : 'string'),
    };
  }
  return {
    type: 'object',
    properties: {
      needed: { type: 'boolean' },
      valid: { type: 'boolean' },
      arguments: { type: 'object', properties, additionalProperties: false },
      explanation: { type: 'string' },
    },
    required: ['needed', 'valid', 'arguments', 'explanation'],
    additionalProperties: false,
  };
}

export function parseParameters(input: unknown) {
  if (!input || typeof input !== 'object')
    throw new Error('No parameter proposal.');
  const value = input as Record<string, unknown>;
  const args = value['arguments'];
  if (
    typeof value['needed'] !== 'boolean' ||
    typeof value['valid'] !== 'boolean' ||
    !args ||
    typeof args !== 'object' ||
    Array.isArray(args) ||
    typeof value['explanation'] !== 'string' ||
    !value['explanation'].trim()
  )
    throw new Error('Malformed parameter proposal.');
  return {
    needed: value['needed'],
    valid: value['valid'],
    args: args as Record<string, unknown>,
    explanation: value['explanation'],
  };
}

export interface AgentAction {
  tool: string;
  args: Record<string, unknown>;
}
export interface AgentPlan {
  actions: AgentAction[];
  explanation: string;
}

// A model proposes the entire finite plan before execution. There is no 'done'
// decision after each successful call: completing this list is an application-owned
// condition. The caller cannot accidentally request more work after a fulfilled seek.
export function parsePlan(
  input: unknown,
  tools: readonly DiscoveredTool[],
): AgentPlan {
  if (!input || typeof input !== 'object')
    throw new Error('Agent returned no plan.');
  const value = input as Record<string, unknown>;
  if (
    !Array.isArray(value['actions']) ||
    value['actions'].length > tools.length ||
    typeof value['explanation'] !== 'string' ||
    !value['explanation'].trim()
  ) {
    throw new Error('Agent returned malformed plan fields.');
  }
  const actions = value['actions'].map((input: unknown) => {
    if (!input || typeof input !== 'object')
      throw new Error('Agent returned malformed action.');
    const action = input as Record<string, unknown>;
    const args = action['arguments'];
    if (
      typeof action['tool'] !== 'string' ||
      !tools.some((tool) => tool.name === action['tool'])
    )
      throw new Error('Agent selected an undiscovered tool.');
    if (!args || typeof args !== 'object' || Array.isArray(args))
      throw new Error('Tool arguments must be an object.');
    return { tool: action['tool'], args: args as Record<string, unknown> };
  });
  if (new Set(actions.map((action) => action.tool)).size !== actions.length)
    throw new Error('Duplicate planned capability.');
  return { actions, explanation: value['explanation'] };
}

// Progressive tool disclosure: first ask which capabilities the request needs,
// without argument schemas or current-state values. Then expose only those
// contracts for argument extraction. A simple mixer request cannot grow movie
// navigation actions inside the second response: that capability is not offered.
export function selectionSchema(tools: readonly DiscoveredTool[]) {
  const flags = Object.fromEntries(
    tools.map((tool) => [tool.name, { type: 'boolean' }]),
  );
  return {
    type: 'object',
    properties: {
      tools: {
        type: 'object',
        properties: flags,
        required: tools.map((tool) => tool.name),
        additionalProperties: false,
      },
      explanation: { type: 'string' },
    },
    required: ['tools', 'explanation'],
    additionalProperties: false,
  };
}

export function parseSelection(
  input: unknown,
  tools: readonly DiscoveredTool[],
) {
  if (!input || typeof input !== 'object')
    throw new Error('Agent returned no capability selection.');
  const value = input as Record<string, unknown>;
  const flags = value['tools'];
  if (
    !flags ||
    typeof flags !== 'object' ||
    Array.isArray(flags) ||
    typeof value['explanation'] !== 'string' ||
    !value['explanation'].trim()
  )
    throw new Error('Malformed capability selection.');
  const selected = flags as Record<string, unknown>;
  if (
    Object.keys(selected).some(
      (name) => !tools.some((tool) => tool.name === name),
    )
  )
    throw new Error('Undiscovered capability selection.');
  if (
    tools.some(
      (tool) =>
        !Object.hasOwn(selected, tool.name) ||
        typeof selected[tool.name] !== 'boolean',
    )
  )
    throw new Error('Malformed capability selection flags.');
  return {
    tools: tools.filter((tool) => selected[tool.name] === true),
    explanation: value['explanation'],
  };
}
