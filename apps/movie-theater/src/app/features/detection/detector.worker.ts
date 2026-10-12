/// <reference lib="webworker" />
import { DetectorReply, DetectorRequest } from './detection.types';
import { decodeYolox, detectorInputSize, toBgrTensor } from './yolox';
import type { InferenceSession } from 'onnxruntime-web';

let session: InferenceSession | undefined;
let ort: typeof import('onnxruntime-web/webgpu') | undefined;
const worker = self as DedicatedWorkerGlobalScope;

worker.onmessage = async (event: MessageEvent<DetectorRequest>) => {
  const request = event.data;
  try {
    if (request.kind === 'load') {
      // Neither the runtime nor the model is fetched until the viewer explicitly enables detection.
      ort = await import('onnxruntime-web/webgpu');
      ort.env.wasm.wasmPaths = request.runtimeUrl;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      const response = await fetch(request.modelUrl);
      if (!response.ok)
        throw new Error(
          'Optional detector assets are missing. Run pnpm onnx:download.',
        );
      const model = await response.arrayBuffer();
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
    const started = performance.now();
    const width = request.frame.width;
    const height = request.frame.height;
    const ratio = Math.min(
      detectorInputSize / width,
      detectorInputSize / height,
    );
    const canvas = new OffscreenCanvas(detectorInputSize, detectorInputSize);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Frame preprocessing is unavailable.');
    context.fillStyle = 'rgb(114,114,114)';
    context.fillRect(0, 0, detectorInputSize, detectorInputSize);
    context.drawImage(
      request.frame,
      0,
      0,
      Math.floor(width * ratio),
      Math.floor(height * ratio),
    );
    const input = new ort.Tensor(
      'float32',
      toBgrTensor(
        context.getImageData(0, 0, detectorInputSize, detectorInputSize).data,
      ),
      [1, 3, detectorInputSize, detectorInputSize],
    );
    try {
      const outputs = await session.run({ [session.inputNames[0]]: input });
      try {
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
        for (const tensor of Object.values(outputs)) tensor.dispose();
      }
    } finally {
      input.dispose();
    }
  } catch (error) {
    worker.postMessage({
      id: request.id,
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    } satisfies DetectorReply);
  } finally {
    if (request.kind === 'scan') request.frame.close();
  }
};
