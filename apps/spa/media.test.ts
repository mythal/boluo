import assert from 'node:assert/strict';
import test from 'node:test';
import { validateImageMedia, validateMessageMedia } from './media';

const file = (type: string) => new File(['content'], 'attachment', { type });

test('accepts PDF as a message attachment', () => {
  assert.equal(validateMessageMedia(file('application/pdf')).isOk, true);
});

test('keeps PDF out of image-only uploads', () => {
  assert.equal(validateImageMedia(file('application/pdf')).isErr, true);
});

test('accepts supported images in both contexts', () => {
  const image = file('image/webp');
  assert.equal(validateImageMedia(image).isOk, true);
  assert.equal(validateMessageMedia(image).isOk, true);
});
