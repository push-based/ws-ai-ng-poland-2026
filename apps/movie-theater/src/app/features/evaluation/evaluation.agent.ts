import type { DiscoveredTool } from '../../core/webmcp/webmcp-client';

// Arguments are a JSON object inside the constrained response, not JSON encoded
// inside a string. That lets the grammar enforce numeric values and permits {} for
// no-argument tools. The execution boundary still validates the selected tool's contract.
export function decisionSchema(tools: readonly DiscoveredTool[]) {
  const properties: Record<string, unknown> = {};
  for (const tool of tools) {
    const schema =
      typeof tool.inputSchema === 'string'
        ? JSON.parse(tool.inputSchema)
        : tool.inputSchema;
    for (const [name, field] of Object.entries(schema?.['properties'] ?? {})) {
      // Keep types here, but let runtime handlers enforce ranges/enum membership.
      // Otherwise a constrained generator could mask the invalid-argument case.
      const value = field as { type?: string; enum?: unknown[] };
      properties[name] = {
        type:
          value.type ??
          (typeof value.enum?.[0] === 'number' ? 'number' : 'string'),
      };
    }
  }
  return {
    type: 'object',
    properties: {
      tool: { enum: [...tools.map((tool) => tool.name), 'done'] },
      arguments: { type: 'object', properties, additionalProperties: false },
      answer: { type: 'string' },
    },
    required: ['tool', 'arguments', 'answer'],
    additionalProperties: false,
  };
}

export function parseDecision(
  input: unknown,
  tools: readonly DiscoveredTool[],
) {
  if (!input || typeof input !== 'object')
    throw new Error('Agent returned no decision.');
  const value = input as Record<string, unknown>;
  const args = value['arguments'];
  if (
    typeof value['tool'] !== 'string' ||
    typeof value['answer'] !== 'string' ||
    !args ||
    typeof args !== 'object' ||
    Array.isArray(args)
  ) {
    throw new Error('Agent returned malformed decision fields.');
  }
  if (
    value['tool'] !== 'done' &&
    !tools.some((tool) => tool.name === value['tool'])
  )
    throw new Error('Agent selected an undiscovered tool.');
  return {
    tool: value['tool'],
    args: args as Record<string, unknown>,
    answer: value['answer'],
  };
}
