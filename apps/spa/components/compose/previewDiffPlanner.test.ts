import assert from 'node:assert/strict';
import test from 'node:test';
import type { PreviewPost } from '@boluo/api';
import {
  buildDiffOps,
  buildPreviewDiffPlan,
  nextKeyframeVersion,
  SEND_KEYFRAME_INTERVAL_MS,
  shouldFallbackLargeTextChange,
  toPreviewSendState,
  type PreviewSendState,
} from './previewDiffPlanner';

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
  entities: [],
  editFor: null,
  edit: null,
  ...overrides,
});

const makeState = (overrides: Partial<PreviewSendState> = {}): PreviewSendState => {
  const preview = makePreview();
  return {
    keyframe: {
      id: preview.id,
      version: 1,
      name: preview.name,
      text: preview.text,
      entities: preview.entities,
      inGame: preview.inGame ?? false,
      isAction: preview.isAction ?? false,
      edit: preview.edit,
    },
    latestVersion: 1,
    lastKeyframeAt: 1_000,
    ...overrides,
  };
};

test('buildDiffOps builds append op', () => {
  const state = makeState();
  const nextPreview = makePreview({ text: 'hello world' });
  const result = buildDiffOps(state.keyframe, nextPreview);
  assert.ok(result);
  assert.deepStrictEqual(result.ops, [{ type: 'A', _: ' world' }]);
});

test('buildDiffOps builds minimal splice op', () => {
  const state = makeState({
    keyframe: { ...makeState().keyframe, text: 'hello world' },
  });
  const nextPreview = makePreview({ text: 'hello there' });
  const result = buildDiffOps(state.keyframe, nextPreview);
  assert.ok(result);
  assert.deepStrictEqual(result.ops, [{ type: 'SPLICE', i: 6, len: 5, _: 'there' }]);
});

test('shouldFallbackLargeTextChange requires both ratio and min chars', () => {
  assert.strictEqual(shouldFallbackLargeTextChange(null), false);
  assert.strictEqual(
    shouldFallbackLargeTextChange({ changedChars: 10, baselineChars: 12 }, 0.7, 64),
    false,
  );
  assert.strictEqual(
    shouldFallbackLargeTextChange({ changedChars: 80, baselineChars: 100 }, 0.7, 64),
    true,
  );
});

test('buildPreviewDiffPlan returns DIFF and bumps latestVersion', () => {
  const state = makeState();
  const nextPreview = makePreview({ text: 'hello world', entities: [{ type: 'Text', start: 0, len: 11 }] });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
    doNotBroadcast: false,
    resetPreview: false,
  });
  assert.strictEqual(plan.type, 'DIFF');
  if (plan.type === 'DIFF') {
    assert.strictEqual(plan.diff.ref, 1);
    assert.strictEqual(plan.diff.v, 2);
    assert.deepStrictEqual(plan.diff.op, [{ type: 'A', _: ' world' }]);
    assert.ok(plan.diff.xs);
    assert.strictEqual(plan.nextState.latestVersion, 2);
  }
});

test('buildPreviewDiffPlan returns NOOP when nothing changed', () => {
  const state = makeState();
  const nextPreview = makePreview();
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
    doNotBroadcast: false,
    resetPreview: false,
  });
  assert.strictEqual(plan.type, 'NOOP');
});

test('buildPreviewDiffPlan falls back to keyframe when interval exceeded', () => {
  const state = makeState({ lastKeyframeAt: 1_000 });
  const nextPreview = makePreview({ text: 'hello world' });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_000 + SEND_KEYFRAME_INTERVAL_MS + 1,
    doNotBroadcast: false,
    resetPreview: false,
  });
  assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME');
});

test('buildPreviewDiffPlan falls back to keyframe for large text replacement', () => {
  const baseText = 'a'.repeat(120);
  const state = makeState({
    keyframe: { ...makeState().keyframe, text: baseText },
  });
  const nextPreview = makePreview({ text: 'b'.repeat(120) });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
    doNotBroadcast: false,
    resetPreview: false,
  });
  assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME');
});

test('buildDiffOps does not split surrogate pair when emoji is replaced', () => {
  const state = makeState({
    keyframe: { ...makeState().keyframe, text: 'abc\uD83C\uDFB2' },
  });
  const nextPreview = makePreview({ text: 'abc\uD83C\uDFAE' });
  const result = buildDiffOps(state.keyframe, nextPreview);
  assert.ok(result);
  for (const op of result.ops) {
    const text = op.type === 'A' || op.type === 'SPLICE' ? op._ : '';
    assert.ok(
      !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text),
      `op text must not contain unpaired surrogates, got ${JSON.stringify(text)}`,
    );
  }
});

test('buildDiffOps does not split surrogate pair when emoji is appended', () => {
  const state = makeState({
    keyframe: { ...makeState().keyframe, text: 'hi\uD83C\uDFB2' },
  });
  const nextPreview = makePreview({ text: 'hi\uD83C\uDFB2\uD83C\uDFAE' });
  const result = buildDiffOps(state.keyframe, nextPreview);
  assert.ok(result);
  for (const op of result.ops) {
    const text = op.type === 'A' || op.type === 'SPLICE' ? op._ : '';
    assert.ok(
      !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text),
      `op text must not contain unpaired surrogates, got ${JSON.stringify(text)}`,
    );
  }
});

test('buildPreviewDiffPlan falls back to keyframe when splice index exceeds u16', () => {
  // Produce a SPLICE (not Append) whose index is past u16 by editing a char in
  // the middle-right of a very long string.
  const head = 'x'.repeat(70_000);
  const tail = 'yyyy';
  const state = makeState({
    keyframe: { ...makeState().keyframe, text: head + 'a' + tail },
  });
  const nextPreview = makePreview({ text: head + 'b' + tail });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
    doNotBroadcast: false,
    resetPreview: false,
  });
  assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME');
});

test('buildPreviewDiffPlan falls back to keyframe when latestVersion would exceed u16', () => {
  const state = makeState({ latestVersion: 65_535 });
  const nextPreview = makePreview({ text: 'hello world' });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
    doNotBroadcast: false,
    resetPreview: false,
  });
  assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME');
});

test('nextKeyframeVersion and toPreviewSendState keep version state consistent', () => {
  const preview = makePreview({ v: 3 });
  const initialState = toPreviewSendState(preview, 3, 2_000);
  assert.strictEqual(initialState.latestVersion, 3);
  assert.strictEqual(initialState.lastKeyframeAt, 2_000);
  assert.strictEqual(nextKeyframeVersion(initialState, preview.id), 4);
  assert.strictEqual(nextKeyframeVersion(initialState, 'another-preview'), 1);
});
