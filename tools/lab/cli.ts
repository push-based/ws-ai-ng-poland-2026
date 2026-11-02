// Workshop lab helper.
//
//   pnpm lab:list            list every exercise and the files you edit
//   pnpm lab:check 2-1       check your solution for exercise 2.1 (or: all)
//   pnpm lab:solve 2-1       copy the reference solution in (your file is backed up)
//   pnpm lab:reset 2-1       restore the original starter file from Git
//
// Checks run in Node against simulated built-in AI, so they work on any laptop.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  labBlocks,
  labExercises,
  type LabExercise,
} from '../../apps/movie-theater/src/app/lab/lab.catalog';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [command, rawId] = process.argv.slice(2);

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function exerciseFor(id: string | undefined): LabExercise {
  const normalized = id?.replace('.', '-');
  const exercise = labExercises.find(
    (candidate) => candidate.id === normalized,
  );
  if (!exercise)
    fail(
      `Unknown exercise "${id ?? ''}". Use an id such as 2-1. Available: ${labExercises.map((e) => e.id).join(', ')}`,
    );
  return exercise;
}

function run(cmd: string, args: string[]): number {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    // Hide Node's experimental/ESM notices: participants should only see check results.
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env['NODE_OPTIONS'] ?? ''} --no-warnings`.trim(),
    },
  });
  return result.status ?? 1;
}

// Checks import the shared catalogue's build output. MCP checks also need the
// compiled server. Build what is needed first (Nx caches, so this is quick).
function prepare(ids: string[]) {
  const projects = ['catalogue'];
  if (ids.some((id) => id.startsWith('4-1') || id.startsWith('4-2')))
    projects.push('cinema-mcp');
  console.log(
    `\n▶ Building ${projects.join(' + ')} (cached after the first run)…`,
  );
  // --skip-nx-cache: these builds take about a second, and a cached build from a
  // different state of your files (e.g. after lab:solve) must never be reused.
  const status = run('pnpm', [
    'exec',
    'nx',
    'run-many',
    '-t',
    'build',
    '-p',
    ...projects,
    '--skip-nx-cache',
    '--output-style=static',
  ]);
  if (status !== 0)
    fail(
      'The build failed. Read the TypeScript error above: it points at the file and line to fix.',
    );
}

function check(id: string | undefined) {
  const ids =
    id === 'all' ? labExercises.map((e) => e.id) : [exerciseFor(id).id];
  const files = ids.map((exerciseId) =>
    join('workshop', 'checks', `${exerciseId}.check.ts`),
  );
  const missing = files.filter((file) => !existsSync(join(root, file)));
  if (missing.length) fail(`No check found: ${missing.join(', ')}`);
  prepare(ids);
  console.log(`\n▶ Checking exercise ${ids.join(', ')}…\n`);
  const status = run('pnpm', [
    'exec',
    'tsx',
    '--test',
    '--test-reporter=./workshop/checks/reporter.ts',
    ...files,
  ]);
  console.log(
    status === 0
      ? '\n✔ All checks passed. Well done!\n'
      : '\n✖ Some checks failed. Read the first ✖ above: its message says what to change.\n  Stuck? Compare with workshop/solutions/<id>/ or run pnpm lab:solve <id>.\n',
  );
  process.exit(status);
}

function solve(id: string | undefined) {
  const exercise = exerciseFor(id);
  for (const file of exercise.files) {
    const solution = join(
      root,
      'workshop',
      'solutions',
      exercise.id,
      basename(file),
    );
    const target = join(root, file);
    if (!existsSync(solution)) fail(`Missing solution file ${solution}`);
    if (existsSync(target)) {
      copyFileSync(target, `${target}.mine`);
      console.log(`  saved your version as ${file}.mine`);
    }
    copyFileSync(solution, target);
    console.log(
      `✔ ${file} ← workshop/solutions/${exercise.id}/${basename(file)}`,
    );
  }
  console.log(
    `\nThe reference solution for ${exercise.id} is in place. Try: pnpm lab:check ${exercise.id}\n`,
  );
}

function reset(id: string | undefined) {
  const exercise = exerciseFor(id);
  for (const file of exercise.files) {
    const target = join(root, file);
    if (existsSync(target)) {
      copyFileSync(target, `${target}.mine`);
      console.log(`  saved your version as ${file}.mine`);
    }
  }
  const status = run('git', ['checkout', 'HEAD', '--', ...exercise.files]);
  if (status !== 0) fail('git could not restore the starter files.');
  console.log(
    `✔ Restored the starter files of ${exercise.id} from your last Git commit.\n`,
  );
}

function list() {
  for (const block of [1, 2, 3, 4] as const) {
    console.log(`\nBlock ${block} · ${labBlocks[block]}`);
    for (const exercise of labExercises.filter((e) => e.block === block))
      console.log(
        `  ${exercise.id}  ${exercise.title}${exercise.optional ? ' (bonus)' : ''}\n       edit: ${exercise.files.join(', ')}`,
      );
  }
  console.log('\nOpen http://127.0.0.1:4200/lab after `pnpm start`.\n');
}

switch (command) {
  case 'check':
    check(rawId);
    break;
  case 'solve':
    solve(rawId);
    break;
  case 'reset':
    reset(rawId);
    break;
  case 'list':
    list();
    break;
  default:
    fail('Usage: pnpm lab:<list|check|solve|reset> <id>');
}
