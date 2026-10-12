import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
for (const mode of ['auto', 'legacy'] as const)
  test(`MCP ${mode}: discover, search, read resource, get prompt, reject invalid arguments`, async () => {
    const client = new Client(
      { name: 'workshop-test', version: '1.0.0' },
      { versionNegotiation: mode === 'auto' ? { mode: 'auto' } : undefined },
    );
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['apps/cinema-mcp/dist/main.js'],
      cwd: process.cwd(),
    });
    try {
      await client.connect(transport);
      assert.match(
        client.getNegotiatedProtocolVersion() ?? '',
        mode === 'auto' ? /^2026-/ : /^2025-/,
      );
      assert.equal((await client.listTools()).tools[0].name, 'search_movies');
      const result = await client.callTool({
        name: 'search_movies',
        arguments: { query: 'fantasy' },
      });
      assert.equal(result.isError, undefined);
      assert.ok(
        result.content.some(
          (block) => block.type === 'text' && block.text.includes('sintel'),
        ),
      );
      assert.equal((await client.listResources()).resources.length, 3);
      const resource = await client.readResource({
        uri: 'cinema://movies/sintel',
      });
      assert.ok(
        resource.contents.some(
          (item) => 'text' in item && item.text.includes('Colin Levy'),
        ),
      );
      assert.equal(
        (await client.listPrompts()).prompts[0].name,
        'film_club_discussion',
      );
      const prompt = await client.getPrompt({
        name: 'film_club_discussion',
        arguments: { movieId: 'sintel' },
      });
      assert.equal(prompt.messages[0].role, 'user');
      try {
        const invalid = await client.callTool({
          name: 'search_movies',
          arguments: { query: 42 },
        });
        assert.equal(invalid.isError, true);
      } catch (error) {
        assert.match(String(error), /invalid|validation|expected|string/i);
      }
      await assert.rejects(() =>
        client.readResource({ uri: 'cinema://movies/invented' }),
      );
    } finally {
      await client.close();
    }
  });
