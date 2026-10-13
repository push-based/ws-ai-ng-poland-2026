import type { DiscoveredTool } from '../../core/webmcp/webmcp-client';

export const selectionInstruction = `Identify only the capabilities explicitly requested by the user.
Do not invent prerequisites, restoration, housekeeping or verification actions.
An informational question does not ask to change the cinema.
Return only the requested JSON object.`;

export function selectionPrompt(
  request: string,
  tools: readonly DiscoveredTool[],
) {
  const flags = Object.fromEntries(tools.map((tool) => [tool.name, false]));
  const purposes = tools.map(({ name, description }) => ({
    name,
    description,
  }));
  return `User request: ${JSON.stringify(request)}
Available capabilities: ${JSON.stringify(purposes)}
Return {"tools":${JSON.stringify(flags)},"explanation":"brief explanation"}.
Set true only for explicitly requested capabilities; false for the others.
A mix adjustment does not require selecting a movie. A seek only moves the playhead.
For a question with no action, set every flag false and answer it in explanation.`;
}

export const extractionInstruction = `Extract arguments for one selected cinema capability.
Check whether this specific operation was actually requested.
Keep every explicitly supplied number unchanged. Do not clamp, truncate or substitute it.
Check the contract's types, required fields, allowed values and ranges.
Return only the requested JSON object.`;

export function parameterPrompt(request: string, tool: DiscoveredTool) {
  const schema =
    typeof tool.inputSchema === 'string'
      ? JSON.parse(tool.inputSchema)
      : tool.inputSchema;
  return `User request: ${JSON.stringify(request)}
Selected capability: ${tool.name}
Purpose: ${tool.description}
Argument contract: ${JSON.stringify(schema)}
Return {"needed":true,"valid":true,"arguments":{},"explanation":"brief explanation"}.
needed is true only if the user explicitly requested this operation.
If it is not requested, set needed false and leave arguments empty.
If requested values are unsupported, set needed true and valid false; explain the problem.
Otherwise set both flags true and supply the required arguments with the user's exact values.
A requested read with no parameters uses needed true, valid true and arguments {}.
For movie IDs, match the named catalogue film. Do not select a film merely to adjust the current movie.
Do not add an operation, a tool name or a sequence to the result.`;
}
