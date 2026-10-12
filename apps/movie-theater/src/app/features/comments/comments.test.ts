import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createComment,
  parseComments,
  COMMENT_STORAGE_KEY,
} from './comments.model.js';
import {
  readComments,
  saveComments,
  CommentStorage,
} from './comments-storage.js';

test('comments retain movie association, Unicode and literal markup after storage round trip', () => {
  const values = new Map<string, string>();
  const storage: CommentStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  const comment = createComment(
    'sintel',
    '  Świetny film! <script>alert(1)</script>  ',
  );
  saveComments(storage, [comment]);
  assert.deepEqual(readComments(storage), [comment]);
  assert.equal(comment.text, 'Świetny film! <script>alert(1)</script>');
  assert.ok(values.has(COMMENT_STORAGE_KEY));
});

test('unknown films, malformed records, duplicate IDs and oversized comments are rejected', () => {
  assert.throws(() => createComment('invented', 'Nice film.'), /Unknown movie/);
  assert.throws(() => createComment('sintel', ' '.repeat(5)));
  assert.throws(() => createComment('sintel', 'x'.repeat(2001)));
  assert.throws(() => parseComments('{broken'));
  assert.throws(() => parseComments('{}'));
  const comment = createComment('sintel', 'Nice film.');
  assert.throws(() => parseComments(JSON.stringify([comment, comment])));
  assert.throws(() =>
    parseComments(JSON.stringify([{ ...comment, movieId: 'invented' }])),
  );
  assert.deepEqual(parseComments(null), []);
});

test('storage failures remain observable instead of claiming the comment was saved', () => {
  const blocked: CommentStorage = {
    getItem: () => {
      throw new Error('Storage blocked');
    },
    setItem: () => {
      throw new Error('Quota exceeded');
    },
  };
  assert.throws(() => readComments(blocked), /Storage blocked/);
  assert.throws(
    () => saveComments(blocked, [createComment('sintel', 'Nice film.')]),
    /Quota/,
  );
});
