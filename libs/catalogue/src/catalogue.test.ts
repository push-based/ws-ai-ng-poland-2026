import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  movies,
  searchMovies,
  getMovie,
  validateAudioMix,
  validateRecommendation,
} from './index.js';
test('catalogue IDs resolve and authored cues cover the entire excerpt without overlap', () => {
  assert.equal(new Set(movies.map((m) => m.id)).size, movies.length);
  for (const movie of movies) {
    assert.equal(getMovie(movie.id), movie);
    assert.equal(movie.captions[0].start, 0);
    assert.equal(movie.captions.at(-1)?.end, 30);
    movie.captions.forEach((cue, i) => {
      assert.ok(cue.end > cue.start);
      if (i) assert.equal(cue.start, movie.captions[i - 1].end);
    });
  }
});
test('search handles language independently from title and mood', () => {
  assert.deepEqual(
    searchMovies('comedy').map((m) => m.id),
    ['bunny'],
  );
  assert.equal(searchMovies('', 'en').length, 2);
  assert.equal(searchMovies('', 'none')[0].id, 'bunny');
  assert.equal(searchMovies('fantasy', 'none').length, 0);
});
test('tool audio validation rejects invalid and non-finite values before state changes', () => {
  assert.throws(() =>
    validateAudioMix({ bass: 99, mid: 0, treble: 0, volume: 0.7 }),
  );
  assert.throws(() =>
    validateAudioMix({ bass: 0, mid: NaN, treble: 0, volume: 0.7 }),
  );
  assert.throws(() =>
    validateAudioMix({ bass: 0, mid: 0, treble: 0, volume: 2 }),
  );
  assert.throws(() => validateAudioMix({}));
  assert.equal(
    validateAudioMix({ bass: -12, mid: 12, treble: 0, volume: 0 }).mid,
    12,
  );
});
test('schema-shaped recommendations still require a real catalogue ID', () => {
  assert.throws(() =>
    validateRecommendation({
      movieId: 'invented',
      reason: 'Valid JSON, false claim.',
    }),
  );
  assert.throws(() =>
    validateRecommendation({ movieId: 'sintel', reason: '' }),
  );
  assert.equal(
    validateRecommendation({ movieId: 'sintel', reason: 'Fantasy fits.' })
      .movieId,
    'sintel',
  );
});
