import { sintelSubtitles } from '../subtitles/sintel.js';
import type { Movie } from '../movie.js';
export const sintel: Movie = {
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
    'The visual language contrasts intimate character moments with expansive landscapes. Look for changes in scale, warm and cool lighting, and the way framing directs attention. These are observation prompts for this screening, rather than claims about every frame in the selected trailer.',
    'This screening uses a 30-second excerpt of the trailer, not the complete film. Its caption track is an actual spoken dialogue, sourced from the trailer’s embedded English subtitle track. Translation preserves the time cues while transforming only the text.',
    'Discussion questions: how does a short trailer establish a world? What can a single frame tell us about composition, and what requires motion or narrative context? A scene-description model should separate observable detail from invented plot.',
  ],
  subtitleSource: 'https://durian.blender.org/download/',
  subtitleLicense: 'CC BY 3.0',
  subtitleCredit: 'Blender Foundation / durian.blender.org',
  captions: sintelSubtitles,
  credit: '© Blender Foundation | durian.blender.org',
  source: 'https://durian.blender.org/about/',
  license: 'CC BY 3.0',
};
