import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import {
  cache,
  output,
  sources,
  manifestFile,
  recipeRevision,
  type Manifest,
} from './config';
import { download } from './download';
import { sha256 } from './files';
import { command } from './process';

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

/** Stage and validate every asset before replacing the app's local media. */
export async function generateMedia(): Promise<void> {
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
      // Generate the small browser asset: -ss selects the source offset, -t limits
      // the excerpt to 30 seconds, scale keeps its aspect ratio, and H.264/AAC provide
      // video/audio. +faststart moves MP4 metadata forward for earlier playback.
      // Caption timestamps were shifted by the same source offset in the catalogue.
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
