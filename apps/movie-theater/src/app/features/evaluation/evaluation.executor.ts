import type { DiscoveredTool } from '../../core/webmcp/webmcp-client';
import type { AgentAction, AgentPlan } from './evaluation.agent';
import type { EvaluationCall } from './evaluation.model';
import { errorMessage } from '../../ai/ai.types';

function validateAction(action: AgentAction, tools: readonly DiscoveredTool[]) {
  const tool = tools.find((tool) => tool.name === action.tool);
  if (!tool) throw new Error('Undiscovered tool.');
  const schema =
    typeof tool.inputSchema === 'string'
      ? JSON.parse(tool.inputSchema)
      : tool.inputSchema;
  const properties =
    (schema?.['properties'] as Record<
      string,
      { type?: string; enum?: unknown[]; minimum?: number; maximum?: number }
    >) ?? {};
  const required = (schema?.['required'] as string[]) ?? [];
  if (required.some((name) => !Object.hasOwn(action.args, name)))
    throw new Error('Missing required tool argument.');
  for (const [name, value] of Object.entries(action.args)) {
    const field = properties[name];
    if (!Object.hasOwn(properties, name))
      throw new Error(`Unexpected argument: ${name}.`);
    if (field.type && typeof value !== field.type)
      throw new Error(`${name} must be ${field.type}.`);
    if (field.enum && !field.enum.includes(value))
      throw new Error(`${name} is not an allowed value.`);
    if (
      typeof value === 'number' &&
      (!Number.isFinite(value) ||
        (field.minimum !== undefined && value < field.minimum) ||
        (field.maximum !== undefined && value > field.maximum))
    )
      throw new Error(`${name} is outside its supported range.`);
  }
}

// Validate the whole proposed plan before making its first change. The browser
// handlers still validate too. This prevents a malformed later step from leaving
// earlier changes behind, and separates model planning from deterministic execution.
export async function executePlan(
  plan: AgentPlan,
  tools: readonly DiscoveredTool[],
  invoke: (action: AgentAction) => Promise<unknown>,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const calls: EvaluationCall[] = [];
  for (const action of plan.actions) {
    try {
      validateAction(action, tools);
    } catch (error) {
      calls.push({
        name: action.tool,
        args: action.args,
        error: errorMessage(error),
      });
      return {
        calls,
        completed: true,
        answer: `Request rejected before execution: ${errorMessage(error)}`,
      };
    }
  }
  for (const action of plan.actions) {
    signal.throwIfAborted();
    const call: EvaluationCall = { name: action.tool, args: action.args };
    calls.push(call);
    try {
      await invoke(action);
    } catch (error) {
      signal.throwIfAborted();
      call.error = errorMessage(error);
      // A handler error can occur after partial work. Stop, report it, and never
      // ask the model to invent a replacement or retry a potentially completed action.
      return {
        calls,
        completed: false,
        answer: `Execution stopped: ${call.error}`,
      };
    }
    signal.throwIfAborted();
  }
  return {
    calls,
    completed: true,
    answer: plan.actions.length
      ? `Completed ${calls.length} requested tool operation${calls.length === 1 ? '' : 's'}.`
      : plan.explanation,
  };
}
