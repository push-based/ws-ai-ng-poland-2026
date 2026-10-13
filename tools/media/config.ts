import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Versioned sources and generation recipe; binary files stay outside Git. */
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const cache = join(root, '.cache', 'cinema-media');

export const output = join(root, 'apps/movie-theater/public/media');

export const manifestFile = join(cache, 'generated.json');

// The receipt is valid only for this generation recipe and these exact source
// hashes. Increment the recipe when crop/encoding settings change so previously
// generated assets are not mistaken for the new recipe's output.
export const recipeRevision = 1;

export const sources = [
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

export interface Manifest {
  recipe: number;
  sources: string[];
  outputs: Record<string, string>;
}
