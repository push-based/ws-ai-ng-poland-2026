# Optional ONNX object detection

The player includes a real YOLOX-Nano detector (approximately 3.5 MiB), exported by Megvii and distributed under Apache-2.0.

```sh
pnpm onnx:download
```

This verifies the pinned model checksum and copies the locked ONNX Runtime Web loader modules/WASM binaries into the ignored local `public/models` directory.
The runtime binaries are larger than the model, but are loaded only after explicit opt-in; none are committed to Git.
The core cinema works without this setup. Missing optional assets produce an actionable detector error, not a broken app.

## Execution and resource boundaries

- Detection starts off. There is no worker, model fetch, GPU session or frame loop until **Enable detection** is clicked.
- ONNX Runtime and inference execute in a dedicated worker, including frame resize, BGR/CHW conversion, output decoding and non-maximum suppression.
- WebGPU is preferred; a failed/unavailable WebGPU provider falls back to labelled WASM.
- Manual scanning pauses the movie and scans one frame.
- Live tracking is a second opt-in, available only with WebGPU. It scans at most once per second, never overlaps inference, and automatically stops if a scan exceeds 250 ms.
- Disabling terminates the worker, rejects pending work and removes overlays. Leaving the movie route disposes the player-scoped detector.
- A generation guard prevents an old load/scan callback from altering a newly enabled detector.
- Boxes are actual model output. Animated characters can have weak or empty detections; no demonstration boxes are fabricated.

Source code: `features/detection` in the Angular app. Native browser AI is independent of this optional runtime.
The pure decoder tests cover channel order, coordinate conversion, overlap suppression and people-only filtering. Lifecycle tests cover zero work before opt-in and worker termination on disable.

## Sources and licences

- [Official YOLOX release](https://github.com/Megvii-BaseDetection/YOLOX/releases/tag/0.1.1rc0)
- [Reference ONNX inference and preprocessing](https://github.com/Megvii-BaseDetection/YOLOX/tree/main/demo/ONNXRuntime)
- [ONNX Runtime WebGPU guide](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html)
- Bundled notices: `apps/movie-theater/public/models/NOTICE.md`, `YOLOX-LICENSE.txt`, and `ONNX-RUNTIME-LICENSE.txt`.
