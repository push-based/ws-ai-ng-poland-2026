import '@angular/compiler';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EnvironmentInjector,
  Injector,
  createEnvironmentInjector,
} from '@angular/core';
import { AiRuntime } from './ai-runtime.service.js';
import { PromptApi } from './prompt/prompt.api.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function environment() {
  return createEnvironmentInjector(
    [AiRuntime, PromptApi],
    Injector.NULL as EnvironmentInjector,
  );
}

test('completion from a reset task cannot clear a newer task or publish old stream state', async () => {
  const injector = environment();
  const runtime = injector.get(AiRuntime);
  const old = deferred<string>();
  const next = deferred<string>();
  try {
    const oldTask = runtime.run('Prompt', 'old', () => old.promise);
    runtime.reset();
    const nextTask = runtime.run('Prompt', 'next', () => next.promise);
    old.resolve('obsolete');
    await assert.rejects(oldTask);
    assert.equal(runtime.busy(), true);
    assert.equal(runtime.error(), '');
    next.resolve('current');
    assert.equal(await nextTask, 'current');
    assert.equal(runtime.busy(), false);
  } finally {
    injector.destroy();
  }
});

test('cancelling a pending stream releases its reader and re-enables the UI', async () => {
  const injector = environment();
  const runtime = injector.get(AiRuntime);
  let cancelled = false;
  try {
    const stream = new ReadableStream<string>({
      cancel() {
        cancelled = true;
      },
    });
    const task = runtime.run('Prompt', 'stream', (signal) =>
      runtime.stream(stream, signal),
    );
    runtime.stop();
    await assert.rejects(task);
    assert.equal(cancelled, true);
    assert.equal(runtime.busy(), false);
    assert.equal(runtime.error(), 'Cancelled.');
  } finally {
    injector.destroy();
  }
});

test('a model returned after cancellation is destroyed rather than kept as a live session', async () => {
  const injector = environment();
  const runtime = injector.get(AiRuntime);
  const prompt = injector.get(PromptApi);
  const started = deferred<void>();
  const creation = deferred<LanguageModel>();
  const original = globalThis.LanguageModel;
  let destroyed = 0;
  try {
    globalThis.LanguageModel = {
      availability: async () => 'available',
      create: () => {
        started.resolve();
        return creation.promise;
      },
    } as unknown as typeof LanguageModel;
    const task = runtime.run('Prompt', 'create', (signal) =>
      prompt.create(signal),
    );
    await started.promise;
    runtime.stop();
    creation.resolve({
      destroy() {
        destroyed++;
      },
    } as LanguageModel);
    await assert.rejects(task);
    assert.equal(destroyed, 1);
  } finally {
    globalThis.LanguageModel = original;
    injector.destroy();
  }
});
