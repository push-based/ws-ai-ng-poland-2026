import type { AudioMix } from '@nano-cinema/catalogue';
export interface EvaluationCall {
  name: string;
  args: Record<string, unknown>;
  error?: string;
}
export interface EvaluationState {
  movieId: string;
  position: number;
  audioMix: AudioMix;
}
export interface EvaluationCase {
  id: string;
  title: string;
  request: string;
}
export interface EvaluationResult {
  id: string;
  request: string;
  status: 'passed' | 'failed' | 'error';
  calls: EvaluationCall[];
  answer: string;
  before: EvaluationState;
  after: EvaluationState;
  detail: string;
  renderedMix: AudioMix | null;
}

// Fixed user intents are the inputs. Expected tool calls are kept out of the model
// prompt: grading must not hand the agent the answer it is meant to discover.
export const evaluationCases: readonly EvaluationCase[] = [
  {
    id: 'read',
    title: 'Read current state',
    request: 'Read the current screening state without changing anything.',
  },
  {
    id: 'mix',
    title: 'Extract mixer arguments',
    request:
      'Set bass to -5 dB, mid to 4 dB, treble to 2 dB and volume to 0.65.',
  },
  {
    id: 'invalid',
    title: 'Reject invalid gain',
    request: 'Set bass to 99 dB, mid and treble to 0 dB, and volume to 0.7.',
  },
  {
    id: 'question',
    title: 'Avoid unrequested action',
    request:
      'What does a bass filter do? This is a question; do not change anything.',
  },
  {
    id: 'seek',
    title: 'Extract seek position',
    request: 'Seek to exactly 6 seconds in the current excerpt.',
  },
  {
    id: 'journey',
    title: 'Select movie, then change mix',
    request:
      'Select Big Buck Bunny, then set bass, mid and treble to 0 dB and volume to 0.3. Do not autoplay.',
  },
];

function sameMix(a: AudioMix, b: AudioMix) {
  return (
    a.bass === b.bass &&
    a.mid === b.mid &&
    a.treble === b.treble &&
    a.volume === b.volume
  );
}

// Grade observable domain outcomes, not exact generated wording. An eloquent
// final reply cannot turn a failed action into a pass. Negative cases must also
// prove the previous state stayed intact; only rejected invalid attempts are allowed.
export function gradeEvaluation(
  id: string,
  calls: readonly EvaluationCall[],
  before: EvaluationState,
  after: EvaluationState,
): boolean {
  const successes = calls.filter((call) => !call.error);
  const changes = successes.filter(
    (call) =>
      call.name !== 'get_screening_state' && call.name !== 'search_movies',
  );
  const unchanged =
    before.movieId === after.movieId &&
    before.position === after.position &&
    sameMix(before.audioMix, after.audioMix);
  if (id === 'read')
    return (
      unchanged &&
      successes.some((call) => call.name === 'get_screening_state') &&
      !calls.some((call) => call.error)
    );
  if (id === 'question')
    return (
      unchanged && changes.length === 0 && !calls.some((call) => call.error)
    );
  if (id === 'invalid')
    return (
      unchanged &&
      changes.length === 0 &&
      calls.every(
        (call) =>
          !call.error ||
          (call.name === 'set_audio_mix' && call.args['bass'] === 99),
      )
    );
  if (id === 'mix')
    return (
      before.movieId === after.movieId &&
      before.position === after.position &&
      sameMix(after.audioMix, { bass: -5, mid: 4, treble: 2, volume: 0.65 }) &&
      changes.length === 1 &&
      changes[0].name === 'set_audio_mix' &&
      !calls.some((call) => call.error)
    );
  if (id === 'seek')
    return (
      after.movieId === before.movieId &&
      after.position === 6 &&
      sameMix(before.audioMix, after.audioMix) &&
      changes.length === 1 &&
      changes[0].name === 'seek_to' &&
      !calls.some((call) => call.error)
    );
  if (id === 'journey')
    return (
      after.movieId === 'bunny' &&
      sameMix(after.audioMix, { bass: 0, mid: 0, treble: 0, volume: 0.3 }) &&
      changes.length === 2 &&
      changes[0].name === 'select_movie' &&
      changes[1].name === 'set_audio_mix' &&
      !calls.some((call) => call.error)
    );
  return false;
}
