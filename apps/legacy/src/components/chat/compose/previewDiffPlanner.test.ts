import assert from 'node:assert/strict';
import test from 'node:test';
import type { PreviewPost } from '../../../api/events.ts';
import {
  buildPreviewDiffPlan,
  SEND_KEYFRAME_INTERVAL_MS,
  toPreviewSendState,
} from './previewDiffPlanner.ts';

const channelId = 'channel-1';

const makePreview = (overrides: Partial<PreviewPost> = {}): PreviewPost => ({
  id: 'preview-1',
  channelId,
  name: 'Alice',
  mediaId: null,
  inGame: true,
  isAction: false,
  text: 'hello',
  clear: false,
  entities: [{ type: 'Text', start: 0, len: 5 }],
  editFor: null,
  edit: null,
  ...overrides,
});

test('legacy preview diff planner emits diff for incremental text change', () => {
  const now = 1_000;
  const currentPreview = makePreview();
  const currentState = toPreviewSendState(currentPreview, 1, now - 1_000);

  const result = buildPreviewDiffPlan({
    channelId,
    currentSendState: currentState,
    nextPreview: makePreview({
      text: 'hello world',
      entities: [{ type: 'Text', start: 0, len: 11 }],
    }),
    now,
    doNotBroadcast: false,
    resetPreview: false,
  });

  assert.strictEqual(result.type, 'DIFF');
  if (result.type !== 'DIFF') return;
  assert.deepStrictEqual(result.diff.op, [{ type: 'A', _: ' world' }]);
  assert.strictEqual(result.diff.ref, 1);
  assert.strictEqual(result.diff.v, 2);
});

test('legacy preview diff planner falls back to keyframe for non-broadcast preview', () => {
  const currentState = toPreviewSendState(makePreview(), 1, 1_000);

  const result = buildPreviewDiffPlan({
    channelId,
    currentSendState: currentState,
    nextPreview: makePreview({ text: null, entities: [] }),
    now: 2_000,
    doNotBroadcast: true,
    resetPreview: false,
  });

  assert.deepStrictEqual(result, { type: 'FALLBACK_TO_KEYFRAME' });
});

test('legacy preview diff planner forces periodic keyframe refresh', () => {
  const currentState = toPreviewSendState(makePreview(), 1, 1_000);

  const result = buildPreviewDiffPlan({
    channelId,
    currentSendState: currentState,
    nextPreview: makePreview({ text: 'hello!' }),
    now: 1_000 + SEND_KEYFRAME_INTERVAL_MS,
    doNotBroadcast: false,
    resetPreview: false,
  });

  assert.deepStrictEqual(result, { type: 'FALLBACK_TO_KEYFRAME' });
});
