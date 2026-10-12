import { dreamSubtitles } from '../subtitles/dream.js';
import type { Movie } from '../movie.js';
export const dream: Movie = {
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
    'The setting mixes machinery with dreamlike spaces. Sound design contributes strongly to its atmosphere. This screening excerpt provides material for visual observation and an audio source for demonstrating equalization and spectrum analysis.',
    'This screening uses an edited 30-second excerpt, derived stills, and an sourced dialogue subtitle track. The timed dialogue is adapted from the linked English subtitle source. The original film has English dialogue, which is represented in the catalogue metadata.',
    'Discussion questions: what changes when two characters interpret the same environment differently? Which details can a language model actually observe in a frame? Validate any generated description against the source image rather than trusting confident wording.',
  ],
  subtitleSource:
    'https://commons.wikimedia.org/wiki/TimedText:Elephants_Dream(HQ).webm.en.srt',
  subtitleLicense: 'CC BY-SA 4.0',
  subtitleCredit: 'Wikimedia Commons timed-text contributors',
  captions: dreamSubtitles,
  credit:
    '© 2006 Blender Foundation / Netherlands Media Art Institute / www.elephantsdream.org',
  source: 'https://orange.blender.org/blog/creative-commons-license-2/',
  license: 'CC BY 2.5',
};
