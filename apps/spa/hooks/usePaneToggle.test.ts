import assert from 'node:assert/strict';
import test from 'node:test';
import { isSamePane } from './usePaneToggle';

test('media preview panes match the same attachment', () => {
  assert.equal(
    isSamePane(
      { type: 'MEDIA_PREVIEW', mediaId: 'media-a' },
      { type: 'MEDIA_PREVIEW', mediaId: 'media-a' },
    ),
    true,
  );
});

test('media preview panes keep different attachments distinct', () => {
  assert.equal(
    isSamePane(
      { type: 'MEDIA_PREVIEW', mediaId: 'media-a' },
      { type: 'MEDIA_PREVIEW', mediaId: 'media-b' },
    ),
    false,
  );
});
