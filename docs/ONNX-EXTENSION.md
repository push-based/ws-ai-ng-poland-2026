# Future extension: local frame detection

A compact ONNX Runtime Web example could complement browser-managed generative models.
It should be an optional, separate Nx feature library loaded only when the participant opens it.
The core workshop and app must not depend on its model/runtime download.

Proposed interaction: pause a local film, capture one frame, run a small object detector, and overlay boxes for **person** detections.
Show the model download size, preprocessing dimensions, backend (WebGPU or WASM), inference time and confidence threshold.
Retain the original frame for comparison and provide a zero-detection case.
An animated character may not be recognised by a detector trained on photographic people; this is a useful domain-shift lesson, not a reason to fabricate detections.
Use a separately licensed real-person test image if needed; no live camera or identity recognition is required.

Before selecting a model:

- Verify model and training-related redistribution terms and include attribution.
- Measure actual compressed download size and memory, rather than assuming “nano” means small.
- Verify the exported ONNX operators against the selected ONNX Runtime Web version.
- Provide WASM fallback where WebGPU is unavailable, and keep runtime/model assets local.
- Verify normalization, resizing/letterboxing, output decoding and non-maximum suppression against known fixtures.
- Dispose tensors/session resources and cancel/ignore stale results when the selected movie changes.

Potential package boundary: `libs/frame-detection`, with `detectPeople(frame, signal)` and a typed list of boxes.
Model choice is intentionally deferred; no ONNX package or model has been added to the core app.
