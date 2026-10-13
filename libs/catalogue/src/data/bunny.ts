import type { Movie } from '../movie.js';
// No spoken dialogue means an empty cue array. Sound effects/music still
// provide a real audio source for the EQ demo; a language model should not
// create a transcript merely because a movie has an audio stream.
export const bunny: Movie = {
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
    'The Peach open-movie project brought artists and developers together to make a film using open-source production tools. Its published production data and film were released under Creative Commons Attribution 3.0. This screening uses a short edited excerpt and derived stills.',
    'The woodland palette, soft lighting and exaggerated proportions establish a playful atmosphere. Watch how gesture and timing communicate personality without dialogue. The soundtrack gives us a useful audible source for experimenting with equalization.',
    'The excerpt has no spoken dialogue, so no dialogue subtitles are displayed. Because the film has no spoken dialogue, the catalogue records its audio language as none; a language filter should never invent a spoken language.',
    'Discussion questions: can a film communicate across languages without speech? How does sound change a scene when bass or treble is reduced? Compare a model-generated teaser against the supplied notes to check that it does not invent an ending.',
  ],
  captions: [],
  credit: '© 2008 Blender Foundation / www.bigbuckbunny.org',
  source: 'https://peach.blender.org/about/',
  license: 'CC BY 3.0',
};
