import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';

/** Execute a fixed argument vector without a shell, optionally streaming output to one explicit file. */
export async function command(
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
