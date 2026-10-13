// Decoded overlay coordinates are fractions of the original video (0–1),
// not raw model-grid values. score is objectness × class score; classId indexes
// the COCO labels. The worker sends only these small results back to the UI.
export interface Detection {
  label: string;
  score: number;
  x: number;
  y: number;
  width: number;
  height: number;
  classId: number;
}
// A discriminated message protocol keeps expensive work in the worker. load
// creates the model session; scan transfers a captured ImageBitmap plus settings.
// The ID pairs each reply with its waiting request; no shared mutable state is needed.
export type DetectorRequest =
  | { id: number; kind: 'load'; modelUrl: string; runtimeUrl: string }
  | {
      id: number;
      kind: 'scan';
      frame: ImageBitmap;
      threshold: number;
      peopleOnly: boolean;
    };
export type DetectorReply =
  | {
      id: number;
      kind: 'ready';
      backend: 'WebGPU' | 'WASM';
      fallbackReason: string;
    }
  | {
      id: number;
      kind: 'result';
      detections: Detection[];
      milliseconds: number;
    }
  | { id: number; kind: 'error'; message: string };
