import '@angular/compiler';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readiness } from './preflight.service.js';

test('preflight distinguishes preparation and unchecked states from unavailable support', () => {
  assert.equal(readiness('available'), 'ready');
  assert.equal(readiness('registered'), 'ready');
  assert.equal(readiness('downloadable'), 'prepare');
  assert.equal(readiness('downloading'), 'prepare');
  assert.equal(readiness('not checked'), 'unchecked');
  assert.equal(readiness('unavailable'), 'unsupported');
  assert.equal(readiness('missing'), 'unsupported');
});
