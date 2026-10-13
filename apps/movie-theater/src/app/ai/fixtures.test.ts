// Fixture checks verify deterministic examples and cue alignment. They do not
// claim native API availability or inference correctness on a participant's device.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movies, getMovie } from '@nano-cinema/catalogue';
import {
  fixtureRecommendation,
  fixtureLanguage,
  fixtureCaptions,
} from './fixtures.js';
test('fixture recommendations are explicitly labelled and point to a real movie', () => {
  for (const query of ['comedy', 'surreal', 'adventure']) {
    const result = fixtureRecommendation(query);
    assert.ok(getMovie(result.movieId));
    assert.match(result.reason, /fixture/);
  }
});
test('Polish caption fixtures retain cue count, originals and IDs', () => {
  for (const movie of movies) {
    assert.equal(fixtureCaptions(movie, 'pl').length, movie.captions.length);
    assert.deepEqual(
      fixtureCaptions(movie, 'en'),
      movie.captions.map((c) => c.text),
    );
  }
  assert.throws(() => fixtureCaptions(movies[0], 'de'), /support/);
});
test('language fixtures cover the Polish workshop example', () => {
  assert.equal(
    fixtureLanguage('Szukam dobrego filmu na wieczór').language,
    'pl',
  );
});
