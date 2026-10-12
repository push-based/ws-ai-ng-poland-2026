import '@angular/compiler';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EnvironmentInjector,
  Injector,
  createEnvironmentInjector,
} from '@angular/core';
import { ObjectDetectionService } from './object-detection.service.js';
import { DetectorRequest } from './detection.types.js';

test('detector construction does no worker work; explicit enable is manual-only, and disable terminates it', async () => {
  const originalWorker = globalThis.Worker;
  const originalDocument = globalThis.document;
  let created = 0;
  let terminated = 0;
  const messages: string[] = [];
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void;
    onerror?: () => void;
    constructor() {
      created++;
    }
    postMessage(request: DetectorRequest) {
      messages.push(request.kind);
      queueMicrotask(() =>
        this.onmessage?.({
          data: {
            id: request.id,
            kind: 'ready',
            backend: 'WebGPU',
            fallbackReason: '',
          },
        }),
      );
    }
    terminate() {
      terminated++;
    }
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  globalThis.document = { baseURI: 'http://127.0.0.1:4200/' } as Document;
  const injector = createEnvironmentInjector(
    [ObjectDetectionService],
    Injector.NULL as EnvironmentInjector,
  );
  try {
    const detector = injector.get(ObjectDetectionService);
    assert.equal(created, 0);
    assert.equal(detector.enabled(), false);
    assert.equal(detector.tracking(), false);
    await detector.enable();
    assert.equal(created, 1);
    assert.equal(detector.ready(), true);
    assert.equal(detector.tracking(), false);
    assert.deepEqual(messages, ['load']);
    detector.disable();
    assert.equal(terminated, 1);
    assert.equal(detector.ready(), false);
    assert.deepEqual(detector.boxes(), []);
  } finally {
    injector.destroy();
    globalThis.Worker = originalWorker;
    globalThis.document = originalDocument;
  }
});
