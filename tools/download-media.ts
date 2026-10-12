/** Explicit, local media setup. Never runs automatically during pnpm install. */
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, '.cache', 'cinema-media');
const output = join(root, 'apps/movie-theater/public/media');
const manifestFile = join(cache, 'generated.json');
// Change the recipe revision when changing encoding/crop/timing settings.
const recipeRevision = 1;
const sources = [
  {
    id: 'bunny',
    file: 'bunny.zip',
    member: 'BigBuckBunny_640x360.m4v',
    start: 30,
    url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v.zip',
    sha256: '7118242b6728d40c871479c5b3c0f0fb27d748089df15d7f1b469f297c74a2d6',
  },
  {
    id: 'dream',
    file: 'dream.mov',
    start: 45,
    url: 'https://download.blender.org/ED/elephantsdream-480-h264-st-aac.mov',
    sha256: 'a7dbacae5fa2bc345dbd7b10588575f3e2bba36012e9a93df5346467053b0634',
  },
  {
    id: 'sintel',
    file: 'sintel.mp4',
    start: 5,
    url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    sha256: 'b670602fa00934ca27c4351bb0efe7ea7a07fae57284e44226025eeed7c51254',
  },
];
interface Manifest {
  recipe: number;
  sources: string[];
  outputs: Record<string, string>;
}
async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function validOutputs(): Promise<Manifest | null> {
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
async function command(
  binary: string,
  args: string[],
  destination?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const writer = destination
      ? createWriteStream(destination, { flags: 'wx' })
      : undefined;
    const copying = writer ? pipeline(child.stdout, writer) : Promise.resolve();
    // Observe stream errors immediately, then await them on process exit.
    void copying.catch(() => child.kill());
    let stdout = '';
    let stderr = '';
    if (!writer)
      child.stdout.on('data', (data) => {
        stdout += String(data);
      });
    child.stderr.on('data', (data) => {
      stderr = (stderr + String(data)).slice(-8000);
    });
    child.once('error', (error) =>
      reject(
        new Error(
          `${binary} could not run: ${error.message}. Install ffmpeg (including ffprobe) and unzip, then retry.`,
        ),
      ),
    );
    child.once('close', async (code) => {
      try {
        await copying;
        if (code !== 0) throw new Error(`${binary} exited ${code}: ${stderr}`);
        resolve(stdout);
      } catch (error) {
        reject(error);
      }
    });
  });
}
async function download(source: (typeof sources)[number]): Promise<string> {
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
async function verifyClip(file: string) {
  const data = JSON.parse(
    await command('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration:stream=codec_type',
      '-of',
      'json',
      file,
    ]),
  ) as { format: { duration: string }; streams: { codec_type: string }[] };
  if (
    Math.abs(Number(data.format.duration) - 30) > 0.1 ||
    !data.streams.some((s) => s.codec_type === 'audio') ||
    !data.streams.some((s) => s.codec_type === 'video')
  )
    throw new Error(
      `Invalid excerpt: ${file}. Expected 30 seconds with video and audio.`,
    );
}
async function main() {
  const args = process.argv.slice(2);
  if (
    args.some(
      (arg) => !['--check', '--fingerprint', '--force', '--help'].includes(arg),
    )
  )
    throw new Error('Unknown option. Use --help.');
  if (args.includes('--help')) {
    console.log(
      'pnpm media:download [--force]\nRequires ffmpeg, ffprobe and unzip. Downloads ~230 MB once; generates ~9 MB of local assets.\n--check: validate existing assets without downloads or external tools\n--fingerprint: print validated output hashes for Nx caching\n--force: regenerate using verified cached sources',
    );
    return;
  }
  const valid = await validOutputs();
  if (args.includes('--check') || args.includes('--fingerprint')) {
    if (!valid)
      throw new Error(
        'Local cinema media is missing or changed. Run pnpm media:download before serving or building the app.',
      );
    console.log(
      args.includes('--fingerprint')
        ? JSON.stringify(valid.outputs)
        : 'All six local media files match the verified generation manifest.',
    );
    return;
  }
  if (valid && !args.includes('--force')) {
    console.log(
      'Local clips and posters are already verified. Nothing to download.',
    );
    return;
  }
  for (const binary of ['ffmpeg', 'ffprobe'])
    await command(binary, ['-version']);
  await command('unzip', ['-v']);
  await mkdir(cache, { recursive: true });
  await mkdir(output, { recursive: true });
  const stage = await mkdtemp(join(cache, 'generate-'));
  try {
    const hashes: Record<string, string> = {};
    for (const source of sources) {
      let input = await download(source);
      if (source.member) {
        const extracted = join(stage, source.member);
        await command('unzip', ['-p', input, source.member], extracted);
        input = extracted;
      }
      console.log(`${source.id}: generating 30-second excerpt and poster`);
      const clip = join(stage, `${source.id}.mp4`);
      const poster = join(stage, `${source.id}.jpg`);
      await command('ffmpeg', [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        String(source.start),
        '-i',
        input,
        '-t',
        '30',
        '-vf',
        'scale=960:-2',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '24',
        '-c:a',
        'aac',
        '-b:a',
        '96k',
        '-movflags',
        '+faststart',
        clip,
      ]);
      await verifyClip(clip);
      await command('ffmpeg', [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        '12',
        '-i',
        clip,
        '-frames:v',
        '1',
        '-update',
        '1',
        '-q:v',
        '2',
        poster,
      ]);
      await access(poster);
      for (const name of [`${source.id}.mp4`, `${source.id}.jpg`])
        hashes[name] = await sha256(join(stage, name));
    }
    // Publish only once every clip has passed validation. A failed generation
    // leaves existing usable media untouched and the next run can reuse sources.
    for (const name of Object.keys(hashes))
      await copyFile(join(stage, name), join(output, name));
    const manifest: Manifest = {
      recipe: recipeRevision,
      sources: sources.map((s) => s.sha256),
      outputs: hashes,
    };
    await writeFile(
      `${manifestFile}.partial`,
      JSON.stringify(manifest, null, 2) + '\n',
    );
    await rename(`${manifestFile}.partial`, manifestFile);
    console.log(
      'Ready: three clips + three posters. Keep media/ATTRIBUTION.md with any published build.',
    );
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
