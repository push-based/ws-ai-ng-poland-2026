export interface Detection {
  label: string;
  score: number;
  x: number;
  y: number;
  width: number;
  height: number;
  classId: number;
}
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
