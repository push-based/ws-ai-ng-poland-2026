export interface Cue {
  start: number;
  end: number;
  text: string;
}
export interface Movie {
  id: string;
  title: string;
  year: number;
  genre: string;
  mood: string;
  color: string;
  director: string;
  audioLanguage: string;
  description: string;
  notes: string[];
  captions: Cue[];
  credit: string;
  source: string;
  license: string;
  excerptStart: number;
}
export const movies: readonly Movie[] = [
  {
    id: 'sintel',
    title: 'Sintel',
    year: 2010,
    genre: 'Fantasy',
    mood: 'Atmospheric · Adventurous',
    color: '#dca47e',
    director: 'Colin Levy',
    audioLanguage: 'en',
    excerptStart: 5,
    description:
      'A young traveller searches for a dragon she once befriended. An intimate fantasy journey through unfamiliar cities and vast landscapes.',
    notes: [
      'Sintel is an independently produced animated fantasy short directed by Colin Levy and released by the Blender Foundation in 2010. Its central character is a young traveller whose bond with a small dragon motivates a journey. This programme note deliberately leaves the ending undisclosed.',
      'The production was the Durian open-movie project. Artists used Blender to develop characters, environments and animation. The film and production assets were released for reuse, making it both a creative work and a practical demonstration of open production.',
      'The visual language contrasts intimate character moments with expansive landscapes. Look for changes in scale, warm and cool lighting, and the way framing directs attention. These are observation prompts for the workshop, rather than claims about every frame in the selected trailer.',
      'The workshop uses a 30-second excerpt of the trailer, not the complete film. Its caption track is an authored programme commentary, not an official dialogue transcript. Translation preserves the time cues while transforming only the text.',
      'Discussion questions: how does a short trailer establish a world? What can a single frame tell us about composition, and what requires motion or narrative context? A scene-description model should separate observable detail from invented plot.',
    ],
    captions: [
      {
        start: 0,
        end: 6,
        text: 'A traveller enters a world of distant cities and wild landscapes.',
      },
      {
        start: 6,
        end: 12,
        text: 'Sintel is a fantasy short directed by Colin Levy.',
      },
      {
        start: 12,
        end: 18,
        text: 'A friendship with a small dragon begins a much larger journey.',
      },
      {
        start: 18,
        end: 24,
        text: 'Notice the contrast between intimate moments and sweeping scenery.',
      },
      {
        start: 24,
        end: 30,
        text: 'Created with Blender. An open movie, shared with the world.',
      },
    ],
    credit: '© Blender Foundation | durian.blender.org',
    source: 'https://durian.blender.org/about/',
    license: 'CC BY 3.0',
  },
  {
    id: 'bunny',
    title: 'Big Buck Bunny',
    year: 2008,
    genre: 'Comedy',
    mood: 'Playful · Lighthearted',
    color: '#b9c88a',
    director: 'Sacha Goedegebure',
    audioLanguage: 'none',
    excerptStart: 30,
    description:
      'A gentle giant enjoys a bright woodland morning. A playful animated comedy with expressive characters and a mischievous streak.',
    notes: [
      'Big Buck Bunny is an animated comedy directed by Sacha Goedegebure and released by the Blender Foundation in 2008. Its protagonist is a large rabbit living in a colourful woodland. The comedy relies on physical action and expressive character animation rather than spoken dialogue.',
      'The Peach open-movie project brought artists and developers together to make a film using open-source production tools. Its published production data and film were released under Creative Commons Attribution 3.0. This workshop uses a short edited excerpt and derived stills.',
      'The woodland palette, soft lighting and exaggerated proportions establish a playful atmosphere. Watch how gesture and timing communicate personality without dialogue. The soundtrack gives us a useful audible source for experimenting with equalization.',
      'Workshop captions provide authored descriptive commentary. They are not subtitles of character speech. Because the film has no spoken dialogue, the catalogue records its audio language as none; a language filter should never invent a spoken language.',
      'Discussion questions: can a film communicate across languages without speech? How does sound change a scene when bass or treble is reduced? Compare a model-generated teaser against the supplied notes to check that it does not invent an ending.',
    ],
    captions: [
      { start: 0, end: 6, text: 'A quiet morning in a colourful woodland.' },
      {
        start: 6,
        end: 12,
        text: 'Meet a gentle giant with an expressive personality.',
      },
      {
        start: 12,
        end: 18,
        text: 'Physical comedy tells the story without spoken dialogue.',
      },
      {
        start: 18,
        end: 24,
        text: 'Listen to the music and the atmosphere of the forest.',
      },
      {
        start: 24,
        end: 30,
        text: 'Big Buck Bunny. A Blender Foundation open movie.',
      },
    ],
    credit: '© 2008 Blender Foundation / www.bigbuckbunny.org',
    source: 'https://peach.blender.org/about/',
    license: 'CC BY 3.0',
  },
  {
    id: 'dream',
    title: 'Elephants Dream',
    year: 2006,
    genre: 'Sci-fi',
    mood: 'Surreal · Mysterious',
    color: '#92bcc4',
    director: 'Bassam Kurdali',
    audioLanguage: 'en',
    excerptStart: 45,
    description:
      'Two people navigate a strange mechanical world. A surreal science-fiction short about perspective, imagination, and the spaces between them.',
    notes: [
      'Elephants Dream is a computer-animated short directed by Bassam Kurdali and released in 2006. Two characters, Proog and Emo, move through a surreal mechanical environment. Their contrasting perspectives form the centre of the film.',
      'The Orange project was an early Blender open-movie production. The team used open-source tools and released production materials alongside the film. Its open distribution made it useful for artists, developers and educators studying digital animation.',
      'The setting mixes machinery with dreamlike spaces. Sound design contributes strongly to its atmosphere. The workshop excerpt provides material for visual observation and an audio source for demonstrating equalization and spectrum analysis.',
      'The workshop uses an edited 30-second excerpt, derived stills, and an authored commentary caption track. The commentary is not an official transcription of the actors. The original film has English dialogue, which is represented in the catalogue metadata.',
      'Discussion questions: what changes when two characters interpret the same environment differently? Which details can a language model actually observe in a frame? Validate any generated description against the source image rather than trusting confident wording.',
    ],
    captions: [
      {
        start: 0,
        end: 6,
        text: 'Two characters explore a strange mechanical world.',
      },
      {
        start: 6,
        end: 12,
        text: 'Proog and Emo see their surroundings differently.',
      },
      {
        start: 12,
        end: 18,
        text: 'Machinery and imagination meet in a surreal landscape.',
      },
      {
        start: 18,
        end: 24,
        text: 'Listen for the details that create the atmosphere.',
      },
      {
        start: 24,
        end: 30,
        text: 'Elephants Dream. The Orange open-movie project.',
      },
    ],
    credit:
      '© 2006 Blender Foundation / Netherlands Media Art Institute / www.elephantsdream.org',
    source: 'https://orange.blender.org/blog/creative-commons-license-2/',
    license: 'CC BY 2.5',
  },
];
export function getMovie(id: string): Movie {
  const movie = movies.find((movie) => movie.id === id);
  if (!movie) throw new Error(`Unknown movie: ${id}`);
  return movie;
}
export function searchMovies(query = '', language = ''): readonly Movie[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return movies.filter(
    (movie) =>
      (!language || movie.audioLanguage === language) &&
      words.every((word) =>
        `${movie.title} ${movie.genre} ${movie.mood} ${movie.description}`
          .toLowerCase()
          .includes(word),
      ),
  );
}
export const audioPresets = {
  flat: { bass: 0, mid: 0, treble: 0, volume: 0.7 },
  dialogue: { bass: -5, mid: 4, treble: 2, volume: 0.65 },
  cinema: { bass: 4, mid: 0, treble: 3, volume: 0.7 },
  night: { bass: -6, mid: 2, treble: -3, volume: 0.35 },
} as const;
export interface AudioMix {
  bass: number;
  mid: number;
  treble: number;
  volume: number;
}
export function validateAudioMix(input: unknown): AudioMix {
  if (!input || typeof input !== 'object')
    throw new Error('Audio mix must be an object.');
  const values = input as Record<string, unknown>;
  const result = {} as AudioMix;
  for (const key of ['bass', 'mid', 'treble', 'volume'] as const) {
    const value = values[key];
    const min = key === 'volume' ? 0 : -12;
    const max = key === 'volume' ? 1 : 12;
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      throw new Error(`${key} must be between ${min} and ${max}.`);
    result[key] = value;
  }
  return result;
}
export interface Recommendation {
  movieId: string;
  reason: string;
}
export function validateRecommendation(input: unknown): Recommendation {
  if (!input || typeof input !== 'object')
    throw new Error('Recommendation must be an object.');
  const value = input as Record<string, unknown>;
  if (
    typeof value['movieId'] !== 'string' ||
    typeof value['reason'] !== 'string' ||
    !value['reason'].trim()
  )
    throw new Error('Invalid recommendation.');
  getMovie(value['movieId']);
  return { movieId: value['movieId'], reason: value['reason'] };
}
