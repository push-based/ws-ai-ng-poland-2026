import { createWriteStream } from 'node:fs';
import { rm, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { cache, sources } from './config';
import { sha256 } from './files';

/** Only a checksum-verified complete download is promoted into the source cache. */
export async function download(
  source: (typeof sources)[number],
): Promise<string> {
  const file = join(cache, source.file);
  try {
    if ((await sha256(file)) === source.sha256) {
      console.log(`${source.id}: reusing verified source`);
      return file;
    }
  } catch {
    /* Missing cache. */
  }
  // A partial download never replaces a verified cache entry.
  const partial = `${file}.partial`;
  await rm(partial, { force: true });
  console.log(`${source.id}: downloading ${source.url}`);
  try {
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    const body = response.body;
    if (!response.ok || !body)
      throw new Error(`HTTP ${response.status} downloading ${source.id}`);
    await pipeline(
      Readable.from(
        (async function* () {
          const reader = body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              yield value;
            }
          } finally {
            await reader.cancel();
            reader.releaseLock();
          }
        })(),
      ),
      createWriteStream(partial, { flags: 'wx' }),
    );
    const actual = await sha256(partial);
    if (actual !== source.sha256)
      throw new Error(
        `Integrity check failed for ${source.id}. Expected ${source.sha256}, received ${actual}. The source may have changed; do not bypass the checksum.`,
      );
    await rename(partial, file);
    return file;
  } finally {
    await rm(partial, { force: true });
  }
}
