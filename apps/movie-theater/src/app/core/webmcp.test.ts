// The compatibility tests distinguish a failure before argument parsing from
// a failure inside a tool action. Only the former is safe to retry with another
// encoding; retrying a completed or partially completed action could duplicate it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeDiscoveredTool, toolMetadata } from './webmcp/webmcp-client.js';
test('native object arguments execute once without compatibility retry', async () => {
  let calls = 0;
  const result = await executeDiscoveredTool(
    {
      executeTool: async (_tool, args) => {
        calls++;
        assert.equal(typeof args, 'object');
        return 'applied';
      },
    },
    { name: 'set_audio_mix' },
    { bass: -5 },
  );
  assert.equal(calls, 1);
  assert.equal(result.argumentEncoding, 'object');
  assert.equal(result.result, 'applied');
});
test('old browser parser retries with JSON encoding before any action executes', async () => {
  let applied = 0;
  const encodings: string[] = [];
  const result = await executeDiscoveredTool(
    {
      executeTool: async (_tool, args) => {
        encodings.push(typeof args);
        if (typeof args !== 'string')
          throw new Error('Failed to parse input arguments');
        assert.equal(JSON.parse(args).bass, -5);
        applied++;
        return 'applied';
      },
    },
    { name: 'set_audio_mix' },
    { bass: -5 },
  );
  assert.deepEqual(encodings, ['object', 'string']);
  assert.equal(applied, 1);
  assert.equal(result.argumentEncoding, 'json-string');
});
test('handler failures are never retried and circular native metadata is omitted', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      executeDiscoveredTool(
        {
          executeTool: async () => {
            calls++;
            throw new Error('Audio action failed');
          },
        },
        { name: 'set_audio_mix' },
        { bass: -5 },
      ),
    /Audio action failed/,
  );
  assert.equal(calls, 1);
  const windowLike: Record<string, unknown> = {};
  windowLike['self'] = windowLike;
  assert.doesNotThrow(() =>
    JSON.stringify(toolMetadata([{ name: 'test', window: windowLike }])),
  );
});
