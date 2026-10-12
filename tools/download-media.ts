/** Explicit local setup: never invoked automatically by dependency installation. */
import { validOutputs } from './media/files';
import { generateMedia } from './media/generate';

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
  await generateMedia();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
