import { Detection } from './detection.types';
import { cocoLabels } from './coco-labels';
// This downloaded YOLOX-Nano export expects [1, 3, 416, 416]: one image,
// three colour channels and a fixed square size. Other model exports can use
// different shapes/preprocessing; these values are a contract with our model.
// Reference maths: https://github.com/Megvii-BaseDetection/YOLOX/blob/main/yolox/utils/demo_utils.py
export const detectorInputSize = 416;

/** YOLOX uses BGR float32 pixels (0–255), CHW order, and top-left letterboxing with 114 padding. */
export function toBgrTensor(rgba: Uint8ClampedArray): Float32Array {
  // Canvas pixels arrive interleaved: R,G,B,A, R,G,B,A, ... . The model expects
  // three complete planes: all blue pixels, then all green, then all red (BGR/CHW).
  // Alpha is discarded, and values stay in 0–255; this export does not use /255
  // normalization. A wrong channel order or scale can produce plausible but bad boxes.
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

// Intersection-over-union (IoU) measures how much two boxes overlap:
// shared area / combined area, where shared area is counted only once.
// 0 means no overlap; 1 means identical boxes. This score lets us remove
// multiple predictions for the same object without merging unrelated objects.
function intersectionOverUnion(a: Detection, b: Detection): number {
  // Compute the overlap width and height from each rectangle's edges. Clamp
  // to zero when the rectangles do not intersect, then multiply to get shared area.
  const intersection =
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  // Union area = area(A) + area(B) − shared area. The fallback denominator
  // avoids division by zero for degenerate boxes; valid decoded boxes have area.
  return (
    intersection / (a.width * a.height + b.width * b.height - intersection || 1)
  );
}

/** Decode raw YOLOX grid output, undo letterboxing, and suppress overlapping boxes of the same class. */
// The ONNX output is not a list of ready-to-draw rectangles. This decoder does:
// 1. Check the raw shape and walk each prediction grid in model output order.
// 2. Choose a class and reject weak predictions using a confidence threshold.
// 3. Recover pixel coordinates, undo frame resizing, and clip to video bounds.
// 4. Keep the strongest box when same-class predictions substantially overlap.
// width/height are the original frame dimensions; returned coordinates are 0–1
// fractions for the overlay. peopleOnly selects COCO class 0, which is 'person'.
export function decodeYolox(
  output: Float32Array,
  width: number,
  height: number,
  threshold: number,
  peopleOnly: boolean,
): Detection[] {
  // YOLOX predicts at three resolutions. stride is the input-pixel distance
  // between grid cells: 8, 16 or 32. With a 416-square input, the grids have
  // 52×52 + 26×26 + 13×13 = 3549 cells; each cell contributes one prediction row.
  // Each row has 85 values: [x offset, y offset, log width, log height, objectness,
  // 80 COCO class scores]. The Float32Array stores all those rows consecutively.
  const expectedRows = [8, 16, 32].reduce(
    (total, stride) => total + (detectorInputSize / stride) ** 2,
    0,
  );
  if (output.length !== expectedRows * 85)
    throw new Error('The detector output shape does not match YOLOX-Nano.');
  // Preprocessing scales the whole frame to fit inside the 416-square input,
  // keeping its aspect ratio. Padding goes on the right/bottom, so there is no
  // left/top offset to subtract. Divide model coordinates by this same resize
  // ratio to recover coordinates in original video pixels.
  const ratio = Math.min(detectorInputSize / width, detectorInputSize / height);
  const candidates: Detection[] = [];
  // The output rows are ordered by stride, then grid y, then grid x. Keep one
  // row counter across all three grids so every raw prediction is matched with
  // the grid cell whose location the model used to encode its coordinates.
  let row = 0;
  for (const stride of [8, 16, 32]) {
    const cells = detectorInputSize / stride;
    for (let y = 0; y < cells; y++)
      for (let x = 0; x < cells; x++, row++) {
        // Jump to the start of this 85-value row in the flat output buffer.
        const offset = row * 85;
        // Person is class 0. In people-only mode, inspect its score even if another
        // class has a higher score. Otherwise find the strongest of all 80 categories.
        // Class scores begin at row offset 5, after the four box values and objectness.
        let classId = 0;
        if (!peopleOnly)
          for (let category = 1; category < 80; category++)
            if (output[offset + 5 + category] > output[offset + 5 + classId])
              classId = category;
        // Objectness estimates whether this cell predicts an object at all. Multiply
        // it by the selected class score to rank this object/class prediction. Example:
        // 0.9 objectness × 0.9 person score = 0.81. This is model confidence, not proof.
        const score = output[offset + 4] * output[offset + 5 + classId];
        if (!Number.isFinite(score) || score < threshold) continue;
        // Recover the box centre: (predicted offset + grid position) × stride.
        // Recover dimensions with exp(log dimension) × stride: the export encodes
        // width/height logarithmically. Then divide all four by the resize ratio.
        // Worked example: at cell (0,0), stride 8, offsets (2,2) and log size log(4),
        // the input-space centre is (16,16) and size is 32×32. At ratio 1, its edges
        // are (0,0)–(32,32); on a 416-square video its normalized width is 32/416.
        const cx = ((output[offset] + x) * stride) / ratio;
        const cy = ((output[offset + 1] + y) * stride) / ratio;
        const boxWidth = (Math.exp(output[offset + 2]) * stride) / ratio;
        const boxHeight = (Math.exp(output[offset + 3]) * stride) / ratio;
        if (!Number.isFinite(boxWidth) || !Number.isFinite(boxHeight)) continue;
        // Convert centre/size into rectangle edges, then clamp to actual video bounds.
        // Predictions can extend into the padded input area; those pixels are not part
        // of the movie. Discard rectangles that have no area after clipping.
        const left = Math.max(0, Math.min(width, cx - boxWidth / 2));
        const top = Math.max(0, Math.min(height, cy - boxHeight / 2));
        const right = Math.max(0, Math.min(width, cx + boxWidth / 2));
        const bottom = Math.max(0, Math.min(height, cy + boxHeight / 2));
        if (right <= left || bottom <= top) continue;
        // Normalize to fractions of the original frame, so CSS percentages place the
        // same rectangle on a player at any display size. classId remains available
        // for duplicate suppression; label is just its readable COCO name.
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
  // Non-maximum suppression (NMS): process highest-confidence boxes first.
  // Keep a candidate only if no already selected box of the same class overlaps
  // it by IoU ≥ 0.45. Different classes do not suppress one another. The threshold
  // is a tuning choice; it can remove real nearby objects as well as duplicates.
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
    // Cap the visible result at 20 boxes to keep the movie overlay readable.
    // This is an application limit, not the number of objects the model predicts.
    if (selected.length === 20) break;
  }
  return selected;
}
