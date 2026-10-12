# Optional object detection assets

YOLOX-Nano ONNX model, from [Megvii's official release](https://github.com/Megvii-BaseDetection/YOLOX/releases/tag/0.1.1rc0).
© Megvii, Inc. and its affiliates. Apache License 2.0; see YOLOX-LICENSE.txt.
Model SHA-256: `c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d`.
COCO label ordering and preprocessing/decoding follow the project's documented ONNX example.

ONNX Runtime Web, © Microsoft Corporation, MIT; see ONNX-RUNTIME-LICENSE.txt.
The runtime loader modules and WASM files are copied from the installed, locked npm version by `pnpm onnx:download`.

Model and runtime binaries are ignored by Git. They remain optional, lazy-loaded, and local to the browser.
