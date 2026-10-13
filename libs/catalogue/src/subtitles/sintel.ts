/** Dialogue excerpt shifted -5s and clipped to 30s.
 * Source: https://download.blender.org/durian/trailer/Sintel_Trailer1.480p.DivX_Plus_HD.mkv
 * Subtitle text license: CC BY 3.0; see docs/SUBTITLES.md.
 */
import type { Cue } from '../movie.js';
// These are sourced dialogue cues, not generated summaries. Subtract the
// excerpt's 5-second starting position from original timestamps (12.149 − 5 = 7.149).
// Translation changes the strings only; these shifted times remain the reference.
export const sintelSubtitles: Cue[] = [
  {
    start: 7.149,
    end: 9.977,
    text: 'What brings you to the\nland of the gatekeepers?',
  },
  {
    start: 13.563,
    end: 15.087,
    text: "I'm searching for someone..",
  },
];
