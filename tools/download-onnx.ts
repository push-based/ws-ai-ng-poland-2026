/** Optional setup. The core app does not require these binaries. */
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { sha256 } from './media/files';
import { download } from './media/download';
import { root } from './media/config';

const output = join(root, 'apps/movie-theater/public/models');
const modelFile = join(output, 'yolox-nano.onnx');
// Pin both the official model URL and its expected bytes. Model-specific
// preprocessing/decoding depends on this exact export; replacing the file
// requires reviewing the input shape, channel layout and output schema too.
const source = {
  id: 'yolox-nano',
  file: 'yolox-nano.onnx',
  start: 0,
  url: 'https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx',
  sha256: 'c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d',
};
async function main() {
  // Nx also builds when detection is not installed. This fingerprint records
  // the actual optional assets when present, so the build cache cannot confuse
  // a model-equipped build with a build that has no optional binaries.
  if (process.argv.includes('--fingerprint')) {
    try {
      const names = (await readdir(join(output, 'ort'))).sort();
      const hashes = await Promise.all(
        names.map(async (name) => [
          name,
          await sha256(join(output, 'ort', name)),
        ]),
      );
      console.log(
        JSON.stringify({ model: await sha256(modelFile), runtime: hashes }),
      );
    } catch {
      console.log('optional-detector-not-installed');
    }
    return;
  }
  await mkdir(join(output, 'ort'), { recursive: true });
  const original = await download(source);
  await copyFile(original, modelFile);
  // Keep the WASM loader modules and binaries from the installed runtime version together.
  // The JS loader and WASM binaries are version-coupled. Copy them from the
  // locked installed package instead of mixing versions or fetching a runtime
  // from a CDN when detection is enabled. The browser selects the variant it needs.
  const runtimeRoot = dirname(
    dirname(createRequire(import.meta.url).resolve('onnxruntime-web')),
  );
  const distribution = join(runtimeRoot, 'dist');
  for (const name of await readdir(distribution)) {
    if (
      /^ort-wasm-simd-threaded(?:\.(?:jsep|jspi|asyncify))?\.(?:mjs|wasm)$/.test(
        name,
      )
    )
      await copyFile(join(distribution, name), join(output, 'ort', name));
  }
  const version = JSON.parse(
    await readFile(join(runtimeRoot, 'package.json'), 'utf8'),
  ).version;
  console.log(
    `Optional YOLOX-Nano ready (3.5 MiB), with local ONNX Runtime ${version} assets. Detection remains off until explicitly enabled.`,
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
