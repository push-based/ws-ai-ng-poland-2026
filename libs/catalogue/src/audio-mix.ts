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
