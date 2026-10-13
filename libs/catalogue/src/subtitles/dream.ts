/** Dialogue excerpt shifted -45s and clipped to 30s.
 * Source: https://commons.wikimedia.org/wiki/TimedText:Elephants_Dream(HQ).webm.en.srt
 * Subtitle text license: CC BY-SA 4.0; see docs/SUBTITLES.md.
 */
import type { Cue } from '../movie.js';
// These are sourced dialogue cues, not generated summaries. Subtract the
// excerpt's 45-second starting position from original timestamps (47.037 − 45 = 2.037).
// Translation changes the strings only; these shifted times remain the reference.
export const dreamSubtitles: Cue[] = [
  {
    start: 2.037,
    end: 3.494,
    text: 'Are you hurt?',
  },
  {
    start: 6.994,
    end: 8.949,
    text: "I don't think so.\nYou?",
  },
  {
    start: 10.16,
    end: 11.985,
    text: "I'm Ok.",
  },
  {
    start: 12.118,
    end: 16.111,
    text: "Get up.\nEmo, it's not safe here.",
  },
  {
    start: 17.034,
    end: 18.573,
    text: "Let's go.",
  },
  {
    start: 18.61,
    end: 20.114,
    text: "What's next?",
  },
  {
    start: 20.2,
    end: 24.146,
    text: "You'll see!",
  },
];
