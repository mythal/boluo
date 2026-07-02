import assert from 'node:assert/strict';
import test from 'node:test';
import { isPreviewInLoadedRange, pruneSelfPreview } from './useChatList';
import { type PreviewItem } from '../state/channel.types';

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

const makePreview = (id: string, senderId: string): PreviewItem =>
  ({ id, senderId }) as PreviewItem;

const myId = 'me';

test('pruneSelfPreview keeps a live self preview', () => {
  const list = [makePreview('p-alice', 'alice'), makePreview('p-self', myId)];

  const hasSelfPreview = pruneSelfPreview(list, myId, 'p-self', false, true);

  assert.strictEqual(hasSelfPreview, true);
  assert.deepStrictEqual(
    list.map((preview) => preview.id),
    ['p-alice', 'p-self'],
  );
});

test('pruneSelfPreview removes only the self preview when it is stale, empty, and hidden', () => {
  // Regression: the old logic spliced twice at the same index when the self
  // preview was both stale and hidden, wrongly removing another user's preview.
  const list = [
    makePreview('p-alice', 'alice'),
    makePreview('p-stale-self', myId),
    makePreview('p-bob', 'bob'),
  ];

  const hasSelfPreview = pruneSelfPreview(list, myId, 'p-new', true, false);

  assert.strictEqual(hasSelfPreview, false);
  assert.deepStrictEqual(
    list.map((preview) => preview.id),
    ['p-alice', 'p-bob'],
  );
});

test('pruneSelfPreview removes a hidden self preview', () => {
  const list = [makePreview('p-self', myId), makePreview('p-bob', 'bob')];

  const hasSelfPreview = pruneSelfPreview(list, myId, 'p-self', false, false);

  assert.strictEqual(hasSelfPreview, false);
  assert.deepStrictEqual(
    list.map((preview) => preview.id),
    ['p-bob'],
  );
});

test('pruneSelfPreview leaves the list untouched without a self preview', () => {
  const list = [makePreview('p-alice', 'alice'), makePreview('p-bob', 'bob')];

  const hasSelfPreview = pruneSelfPreview(list, myId, 'p-new', true, false);

  assert.strictEqual(hasSelfPreview, false);
  assert.deepStrictEqual(
    list.map((preview) => preview.id),
    ['p-alice', 'p-bob'],
  );
});
