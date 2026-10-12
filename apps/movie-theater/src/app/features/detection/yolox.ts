import { Detection } from './detection.types';
import { cocoLabels } from './coco-labels';
export const detectorInputSize = 416;

/** YOLOX uses BGR float32 pixels (0–255), CHW order, and top-left letterboxing with 114 padding. */
export function toBgrTensor(rgba: Uint8ClampedArray): Float32Array {
  const area = detectorInputSize * detectorInputSize;
  if (rgba.length !== area * 4)
    throw new Error('Unexpected detector frame size.');
  const tensor = new Float32Array(area * 3);
  for (let pixel = 0; pixel < area; pixel++) {
    tensor[pixel] = rgba[pixel * 4 + 2];
    tensor[area + pixel] = rgba[pixel * 4 + 1];
    tensor[area * 2 + pixel] = rgba[pixel * 4];
  }
  return tensor;
}

function intersectionOverUnion(a: Detection, b: Detection): number {
  const intersection =
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return (
    intersection / (a.width * a.height + b.width * b.height - intersection || 1)
  );
}

/** Decode raw YOLOX grid output, undo letterboxing, and suppress overlapping boxes of the same class. */
export function decodeYolox(
  output: Float32Array,
  width: number,
  height: number,
  threshold: number,
  peopleOnly: boolean,
): Detection[] {
  const expectedRows = [8, 16, 32].reduce(
    (total, stride) => total + (detectorInputSize / stride) ** 2,
    0,
  );
  if (output.length !== expectedRows * 85)
    throw new Error('The detector output shape does not match YOLOX-Nano.');
  const ratio = Math.min(detectorInputSize / width, detectorInputSize / height);
  const candidates: Detection[] = [];
  let row = 0;
  for (const stride of [8, 16, 32]) {
    const cells = detectorInputSize / stride;
    for (let y = 0; y < cells; y++)
      for (let x = 0; x < cells; x++, row++) {
        const offset = row * 85;
        let classId = 0;
        if (!peopleOnly)
          for (let category = 1; category < 80; category++)
            if (output[offset + 5 + category] > output[offset + 5 + classId])
              classId = category;
        const score = output[offset + 4] * output[offset + 5 + classId];
        if (!Number.isFinite(score) || score < threshold) continue;
        const cx = ((output[offset] + x) * stride) / ratio;
        const cy = ((output[offset + 1] + y) * stride) / ratio;
        const boxWidth = (Math.exp(output[offset + 2]) * stride) / ratio;
        const boxHeight = (Math.exp(output[offset + 3]) * stride) / ratio;
        if (!Number.isFinite(boxWidth) || !Number.isFinite(boxHeight)) continue;
        const left = Math.max(0, Math.min(width, cx - boxWidth / 2));
        const top = Math.max(0, Math.min(height, cy - boxHeight / 2));
        const right = Math.max(0, Math.min(width, cx + boxWidth / 2));
        const bottom = Math.max(0, Math.min(height, cy + boxHeight / 2));
        if (right <= left || bottom <= top) continue;
        candidates.push({
          classId,
          label: cocoLabels[classId],
          score,
          x: left / width,
          y: top / height,
          width: (right - left) / width,
          height: (bottom - top) / height,
        });
      }
  }
  candidates.sort((a, b) => b.score - a.score);
  const selected: Detection[] = [];
  for (const candidate of candidates) {
    if (
      selected.every(
        (box) =>
          box.classId !== candidate.classId ||
          intersectionOverUnion(box, candidate) < 0.45,
      )
    )
      selected.push(candidate);
    if (selected.length === 20) break;
  }
  return selected;
}
