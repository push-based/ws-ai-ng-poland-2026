import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeYolox, toBgrTensor } from './yolox.js';

test('image preprocessing preserves the required BGR planar channel order', () => {
  const image = new Uint8ClampedArray(416 * 416 * 4);
  image.set([11, 22, 33, 255]);
  const tensor = toBgrTensor(image);
  assert.equal(tensor[0], 33);
  assert.equal(tensor[416 * 416], 22);
  assert.equal(tensor[2 * 416 * 416], 11);
  assert.throws(() => toBgrTensor(new Uint8ClampedArray(4)), /frame size/);
});

test('raw grid predictions decode to normalized boxes and duplicate boxes are suppressed', () => {
  const output = new Float32Array(3549 * 85);
  // Two grid cells predict the same person box, with different confidence.
  output.set([2, 2, Math.log(4), Math.log(4), 0.9, 0.9], 0);
  output.set([1, 2, Math.log(4), Math.log(4), 0.8, 0.9], 85);
  const boxes = decodeYolox(output, 416, 416, 0.35, true);
  assert.equal(boxes.length, 1);
  assert.equal(boxes[0].label, 'person');
  assert.ok(Math.abs(boxes[0].score - 0.81) < 0.0001);
  assert.equal(boxes[0].x, 0);
  assert.ok(Math.abs(boxes[0].width - 32 / 416) < 0.0001);
  assert.throws(
    () => decodeYolox(new Float32Array(85), 416, 416, 0.35, true),
    /shape/,
  );
});

test('empty outputs remain empty and people-only filtering excludes other classes', () => {
  const output = new Float32Array(3549 * 85);
  assert.deepEqual(decodeYolox(output, 960, 540, 0.35, true), []);
  output.set([2, 2, Math.log(4), Math.log(4), 0.9], 0);
  output[7] = 0.95; // COCO class 2: car.
  assert.deepEqual(decodeYolox(output, 960, 540, 0.35, true), []);
  assert.equal(decodeYolox(output, 960, 540, 0.35, false)[0].label, 'car');
});
