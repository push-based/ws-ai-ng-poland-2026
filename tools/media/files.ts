import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  manifestFile,
  recipeRevision,
  sources,
  output,
  type Manifest,
} from './config';

/** Verify outputs against a generation receipt; check mode performs no network requests. */
export async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function validOutputs(): Promise<Manifest | null> {
  try {
    const manifest = JSON.parse(
      await readFile(manifestFile, 'utf8'),
    ) as Manifest;
    if (
      manifest.recipe !== recipeRevision ||
      JSON.stringify(manifest.sources) !==
        JSON.stringify(sources.map((s) => s.sha256))
    )
      return null;
    const expected = sources.flatMap((s) => [`${s.id}.mp4`, `${s.id}.jpg`]);
    if (Object.keys(manifest.outputs).length !== expected.length) return null;
    for (const name of expected)
      if ((await sha256(join(output, name))) !== manifest.outputs[name])
        return null;
    return manifest;
  } catch {
    return null;
  }
}
