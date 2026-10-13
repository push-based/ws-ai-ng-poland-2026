/// <reference lib="webworker" />
import { DetectorReply, DetectorRequest } from './detection.types';
import { decodeYolox, detectorInputSize, toBgrTensor } from './yolox';
import type { InferenceSession } from 'onnxruntime-web';

let session: InferenceSession | undefined;
let ort: typeof import('onnxruntime-web/webgpu') | undefined;
const worker = self as DedicatedWorkerGlobalScope;

// The worker owns ONNX Runtime and the inference session. The UI sends load
// only after opt-in, then scan messages for specific captured frames. Replies
// carry the original request ID so the UI can resolve the correct promise.
worker.onmessage = async (event: MessageEvent<DetectorRequest>) => {
  const request = event.data;
  try {
    if (request.kind === 'load') {
      // Neither the runtime nor the model is fetched until the viewer explicitly enables detection.
      ort = await import('onnxruntime-web/webgpu');
      // Point runtime loaders at our locally downloaded matching version. WASM
      // fallback uses one thread, avoiding a multithreaded/shared-memory requirement.
      // proxy is false because this code is already running inside our own worker.
      ort.env.wasm.wasmPaths = request.runtimeUrl;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      const response = await fetch(request.modelUrl);
      if (!response.ok)
        throw new Error(
          'Optional detector assets are missing. Run pnpm onnx:download.',
        );
      const model = await response.arrayBuffer();
      // Try WebGPU first: the execution provider decides where ONNX operations run.
      // A missing GPU API or failed provider initialization falls back to WASM CPU
      // inference, still inside the worker. Report the chosen backend honestly so
      // participants can distinguish GPU acceleration from on-device CPU inference.
      let backend: 'WebGPU' | 'WASM' = 'WebGPU';
      let fallbackReason = '';
      try {
        if (!('gpu' in navigator))
          throw new Error('WebGPU is not exposed by this browser.');
        session = await ort.InferenceSession.create(model, {
          executionProviders: ['webgpu'],
        });
      } catch (error) {
        fallbackReason = error instanceof Error ? error.message : String(error);
        backend = 'WASM';
        session = await ort.InferenceSession.create(model, {
          executionProviders: ['wasm'],
        });
      }
      worker.postMessage({
        id: request.id,
        kind: 'ready',
        backend,
        fallbackReason,
      } satisfies DetectorReply);
      return;
    }

    if (!session || !ort) throw new Error('Enable the detector first.');
    // Measure the whole scan path below (preprocessing, inference and decoding),
    // not just GPU kernel time. This end-to-end latency is what our live-tracking
    // controls use to decide whether the device should stay in manual mode.
    const started = performance.now();
    const width = request.frame.width;
    const height = request.frame.height;
    // Step 1 — fit the source frame into the model's fixed input square without
    // stretching. Resize by the smaller width/height ratio so both dimensions fit.
    const ratio = Math.min(
      detectorInputSize / width,
      detectorInputSize / height,
    );
    const canvas = new OffscreenCanvas(detectorInputSize, detectorInputSize);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Frame preprocessing is unavailable.');
    // YOLOX's reference preprocessing fills unused pixels with 114 and anchors
    // the resized image at (0,0). This is top-left letterboxing, not centred padding.
    // The decoder must reverse this exact geometry or the overlay will be misplaced.
    context.fillStyle = 'rgb(114,114,114)';
    context.fillRect(0, 0, detectorInputSize, detectorInputSize);
    context.drawImage(
      request.frame,
      0,
      0,
      Math.floor(width * ratio),
      Math.floor(height * ratio),
    );
    // Step 2 — turn resized canvas pixels into the model tensor. Shape is NCHW:
    // N=1 frame, C=3 BGR planes, H=W=416. Float32 describes each element's numeric
    // representation, not normalization; the channel conversion keeps 0–255 values.
    const input = new ort.Tensor(
      'float32',
      toBgrTensor(
        context.getImageData(0, 0, detectorInputSize, detectorInputSize).data,
      ),
      [1, 3, detectorInputSize, detectorInputSize],
    );
    try {
      // Step 3 — run the ONNX graph with the session's declared input name. Runtime
      // returns named tensors, not labels or DOM boxes. This export has one output,
      // whose flat values are decoded using its YOLOX-specific format below.
      const outputs = await session.run({ [session.inputNames[0]]: input });
      try {
        // Step 4 — decode raw grid predictions into normalized boxes, filter scores
        // and suppress duplicates. Return those results rather than sending large
        // input/output tensors back to the main thread.
        const detections = decodeYolox(
          outputs[session.outputNames[0]].data as Float32Array,
          width,
          height,
          request.threshold,
          request.peopleOnly,
        );
        worker.postMessage({
          id: request.id,
          kind: 'result',
          detections,
          milliseconds: Math.round(performance.now() - started),
        } satisfies DetectorReply);
      } finally {
        // Inference tensors can hold native/GPU resources. Dispose every output
        // after reading it, even if decoding or posting the result throws.
        for (const tensor of Object.values(outputs)) tensor.dispose();
      }
    } finally {
      // Release the input tensor for each scan as well. Repeated inference should
      // not accumulate frame tensors for the lifetime of the enabled detector.
      input.dispose();
    }
  } catch (error) {
    worker.postMessage({
      id: request.id,
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    } satisfies DetectorReply);
  } finally {
    // The main thread transferred ownership of this bitmap to the worker. Close
    // it after every scan, including failure, to release the captured frame resources.
    // Disabling terminates this worker and therefore its longer-lived model session.
    if (request.kind === 'scan') request.frame.close();
  }
};
