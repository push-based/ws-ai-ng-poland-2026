import type { Recommendation } from './movie.js';
import { getMovie } from './catalogue.js';
// Constrained JSON is not sufficient trust. Parse it as unknown, check its
// fields, and resolve the ID against the real catalogue before acting on it.
// This checks structure/domain membership, not the truth of the model's reason.
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
