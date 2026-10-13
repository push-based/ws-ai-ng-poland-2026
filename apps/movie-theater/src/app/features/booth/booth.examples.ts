import { audioPresets } from '@nano-cinema/catalogue';
export type BoothExample = 'dialogue' | 'night' | 'invalid' | 'state';
// These are predefined structured calls, not natural-language parsing. The
// 'invalid' case intentionally asks for 99 dB so participants can observe
// validation reject it while the existing real audio mix remains unchanged.
export function boothCommand(kind: BoothExample): {
  name: string;
  args: Record<string, unknown>;
} {
  return kind === 'state'
    ? { name: 'get_screening_state', args: {} }
    : {
        name: 'set_audio_mix',
        args:
          kind === 'invalid'
            ? { bass: 99, mid: 0, treble: 0, volume: 0.7 }
            : { ...audioPresets[kind] },
      };
}
