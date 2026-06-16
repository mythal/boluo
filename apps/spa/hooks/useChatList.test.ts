import assert from 'node:assert/strict';
import test from 'node:test';
import { isPreviewInLoadedRange } from './useChatList';

test('isPreviewInLoadedRange uses loaded range instead of filtered visible range', () => {
  const loadedMinPos = 1;
  const filteredVisibleMinPos = 10;
  const previewPos = 5;

  assert.strictEqual(isPreviewInLoadedRange(previewPos, filteredVisibleMinPos, false), false);
  assert.strictEqual(isPreviewInLoadedRange(previewPos, loadedMinPos, false), true);
});

test('isPreviewInLoadedRange only allows previews above unloaded history when fully loaded', () => {
  const loadedMinPos = 10;
  const previewPos = 5;

  assert.strictEqual(isPreviewInLoadedRange(previewPos, loadedMinPos, false), false);
  assert.strictEqual(isPreviewInLoadedRange(previewPos, loadedMinPos, true), true);
});
