import assert from 'node:assert/strict';
import test from 'node:test';
import { isChunkLoadError } from '@boluo/utils/errors';

const chunkLoadErrors = [
  Object.assign(new Error('Failed to load chunk /_next/static/chunks/example.js'), {
    name: 'ChunkLoadError',
  }),
  new TypeError('Failed to fetch dynamically imported module: /assets/Chat.js'),
  new TypeError('Importing a module script failed.'),
  new TypeError("'text/html' is not a valid JavaScript MIME type."),
  new Error('Unable to preload CSS for /assets/example.css'),
];

test('recognizes chunk loading errors from supported bundlers and browsers', () => {
  for (const error of chunkLoadErrors) {
    assert.equal(isChunkLoadError(error), true, error.message);
  }
});

test('does not classify unrelated errors as chunk loading failures', () => {
  assert.equal(isChunkLoadError(new Error('Failed to fetch API response')), false);
  assert.equal(isChunkLoadError('Loading chunk 123 failed'), false);
});
