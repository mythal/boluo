import assert from 'node:assert/strict';
import test from 'node:test';
import type { PreviewDiffPost, PreviewPost } from '@boluo/types/bindings';
import {
  applyPreviewDiffOps,
  buildDiffOps,
  buildPreviewDiffPlan,
  isClearedPreviewContent,
  nextKeyframeVersion,
  resolvePreviewDiff,
  SEND_KEYFRAME_INTERVAL_MS,
  shouldFallbackLargeTextChange,
  toPreviewDiffBase,
  toPreviewSendState,
  type PreviewSendState,
} from './diff';

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

const makeState = (
  previewOverrides: Partial<PreviewPost> = {},
  stateOverrides: Partial<PreviewSendState> = {},
): PreviewSendState => ({
  ...toPreviewSendState(makePreview(previewOverrides), 1, 1_000),
  ...stateOverrides,
});

const makeDiff = (overrides: Partial<PreviewDiffPost> = {}): PreviewDiffPost => ({
  ch: channelId,
  id: 'preview-1',
  ref: 1,
  v: 2,
  op: [{ type: 'A', _: ' world' }],
  ...overrides,
});

test('isClearedPreviewContent follows the server clearing semantics', () => {
  const textEntity = [{ type: 'Text' as const, start: 0, len: 3 }];

  assert.strictEqual(isClearedPreviewContent({ text: '', entities: [] }), true);
  assert.strictEqual(isClearedPreviewContent({ text: '   ', entities: textEntity }), true);
  assert.strictEqual(isClearedPreviewContent({ text: 'text', entities: [] }), true);
  assert.strictEqual(isClearedPreviewContent({ text: 'text', entities: textEntity }), false);
  assert.strictEqual(isClearedPreviewContent({ text: null, entities: [] }), false);
});

test('toPreviewDiffBase normalizes an incoming preview', () => {
  assert.deepStrictEqual(toPreviewDiffBase(makePreview({ v: undefined, text: null })), {
    id: 'preview-1',
    version: 0,
    name: 'Alice',
    text: null,
    entities: [{ type: 'Text', start: 0, len: 5 }],
  });
});

test('resolvePreviewDiff validates and applies a diff relative to its keyframe', () => {
  const keyframe = toPreviewDiffBase(makePreview({ v: 1 }));
  let parsedText: string | null = null;
  const resolved = resolvePreviewDiff({
    keyframe,
    currentVersion: 1,
    diff: makeDiff(),
    parseEntities: (text) => {
      parsedText = text;
      return [{ type: 'Text', start: 0, len: text.length }];
    },
  });

  assert.deepStrictEqual(resolved, {
    name: 'Alice',
    text: 'hello world',
    entities: [{ type: 'Text', start: 0, len: 11 }],
    version: 2,
  });
  assert.strictEqual(parsedText, 'hello world');
});

test('resolvePreviewDiff uses transmitted entities without reparsing', () => {
  const entities = [{ type: 'Text' as const, start: 1, len: 4 }];
  const resolved = resolvePreviewDiff({
    keyframe: toPreviewDiffBase(makePreview({ v: 1 })),
    currentVersion: 1,
    diff: makeDiff({ xs: entities }),
    parseEntities: () => {
      throw new Error('transmitted entities should not be reparsed');
    },
  });

  assert.deepStrictEqual(resolved?.entities, entities);
});

test('resolvePreviewDiff keeps keyframe entities when reparsing fails', () => {
  const keyframe = toPreviewDiffBase(makePreview({ v: 1 }));
  const parseError = new Error('parse failed');
  let reported: { error: unknown; text: string } | null = null;
  const resolved = resolvePreviewDiff({
    keyframe,
    currentVersion: 1,
    diff: makeDiff(),
    parseEntities: () => {
      throw parseError;
    },
    onParseError: (error, text) => {
      reported = { error, text };
    },
  });

  assert.deepStrictEqual(resolved?.entities, keyframe.entities);
  assert.deepStrictEqual(reported, { error: parseError, text: 'hello world' });
});

test('resolvePreviewDiff rejects incompatible, stale, and invalid diffs', () => {
  const keyframe = toPreviewDiffBase(makePreview({ v: 1 }));
  const parseEntities = () => keyframe.entities;
  const resolve = (diff: PreviewDiffPost) =>
    resolvePreviewDiff({ keyframe, currentVersion: 2, diff, parseEntities });

  assert.strictEqual(resolve(makeDiff({ id: 'another-preview', v: 3 })), null);
  assert.strictEqual(resolve(makeDiff({ ref: 999, v: 3 })), null);
  assert.strictEqual(resolve(makeDiff({ v: 2 })), null);
  assert.strictEqual(
    resolve(makeDiff({ v: 3, op: [{ type: 'SPLICE', i: 999, len: 1, _: 'x' }] })),
    null,
  );
  assert.strictEqual(
    applyPreviewDiffOps(toPreviewDiffBase(makePreview({ text: null })), [{ type: 'A', _: 'text' }]),
    null,
  );
});

test('buildDiffOps builds append op', () => {
  const state = makeState();
  const nextPreview = makePreview({ text: 'hello world' });
  const result = buildDiffOps(state.keyframe, nextPreview);
  assert.ok(result);
  assert.deepStrictEqual(result.ops, [{ type: 'A', _: ' world' }]);
});

test('buildDiffOps builds minimal splice op', () => {
  const state = makeState({ text: 'hello world' });
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
  const nextPreview = makePreview({
    text: 'hello world',
    entities: [{ type: 'Text', start: 0, len: 11 }],
  });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
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
  });
  assert.strictEqual(plan.type, 'NOOP');
});

test('buildPreviewDiffPlan ignores entity-only changes when text is unchanged', () => {
  const state = makeState();
  const nextPreview = makePreview({
    entities: [{ type: 'Text', start: 1, len: 4 }],
  });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
  });

  assert.strictEqual(plan.type, 'NOOP');
});

test('buildPreviewDiffPlan sends an empty diff when reverting to the keyframe', () => {
  const changed = buildPreviewDiffPlan({
    channelId,
    currentSendState: makeState(),
    nextPreview: makePreview({
      text: 'hello world',
      entities: [{ type: 'Text', start: 0, len: 11 }],
    }),
    now: 1_100,
  });
  assert.strictEqual(changed.type, 'DIFF');
  if (changed.type !== 'DIFF') return;

  const unchanged = buildPreviewDiffPlan({
    channelId,
    currentSendState: changed.nextState,
    nextPreview: makePreview({
      text: 'hello world',
      entities: [{ type: 'Text', start: 0, len: 11 }],
    }),
    now: 1_150,
  });
  assert.strictEqual(unchanged.type, 'NOOP');

  const reverted = buildPreviewDiffPlan({
    channelId,
    currentSendState: changed.nextState,
    nextPreview: makePreview(),
    now: 1_200,
  });
  assert.strictEqual(reverted.type, 'DIFF');
  if (reverted.type === 'DIFF') {
    assert.strictEqual(reverted.diff.v, 3);
    assert.deepStrictEqual(reverted.diff.op, []);
    assert.deepStrictEqual(reverted.diff.xs, [{ type: 'Text', start: 0, len: 5 }]);

    const unchangedAgain = buildPreviewDiffPlan({
      channelId,
      currentSendState: reverted.nextState,
      nextPreview: makePreview(),
      now: 1_300,
    });
    assert.strictEqual(unchangedAgain.type, 'NOOP');
  }
});

test('buildPreviewDiffPlan falls back to keyframe when interval exceeded', () => {
  const state = makeState({}, { lastKeyframeAt: 1_000 });
  const nextPreview = makePreview({ text: 'hello world' });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_000 + SEND_KEYFRAME_INTERVAL_MS + 1,
  });
  assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME');
});

test('buildPreviewDiffPlan falls back to keyframe after cleared preview', () => {
  const cases: Array<Pick<PreviewSendState['keyframe'], 'text' | 'entities'>> = [
    { text: '', entities: [] },
    { text: '   ', entities: [{ type: 'Text', start: 0, len: 3 }] },
    { text: 'not parsed', entities: [] },
  ];

  for (const clearedKeyframe of cases) {
    const state = makeState(clearedKeyframe);
    const nextPreview = makePreview({
      text: 'hello again',
      entities: [{ type: 'Text', start: 0, len: 11 }],
    });
    const plan = buildPreviewDiffPlan({
      channelId,
      currentSendState: state,
      nextPreview,
      now: 1_100,
    });
    assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME', JSON.stringify(clearedKeyframe));
  }
});

test('buildPreviewDiffPlan falls back to keyframe when the next preview is cleared', () => {
  const cases: Array<Pick<PreviewPost, 'text' | 'entities'>> = [
    { text: '', entities: [] },
    { text: '   ', entities: [{ type: 'Text', start: 0, len: 3 }] },
    { text: 'not parsed', entities: [] },
  ];

  for (const clearedPreview of cases) {
    const plan = buildPreviewDiffPlan({
      channelId,
      currentSendState: makeState(),
      nextPreview: makePreview(clearedPreview),
      now: 1_100,
    });
    assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME', JSON.stringify(clearedPreview));
  }
});

test('buildPreviewDiffPlan falls back to keyframe when preview content is hidden', () => {
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: makeState(),
    nextPreview: makePreview({ text: null, entities: [] }),
    now: 1_100,
  });

  assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME');
});

test('buildPreviewDiffPlan falls back to keyframe when non-diffable fields change', () => {
  const cases: Array<Partial<PreviewPost>> = [
    { channelId: 'channel-2' },
    { mediaId: 'media-1' },
    { clear: true },
    { editFor: '2024-01-01T00:00:00.000Z' },
  ];

  for (const overrides of cases) {
    const state = makeState();
    const nextPreview = makePreview({
      ...overrides,
      text: 'hello world',
      entities: [{ type: 'Text', start: 0, len: 11 }],
    });
    const plan = buildPreviewDiffPlan({
      channelId: nextPreview.channelId,
      currentSendState: state,
      nextPreview,
      now: 1_100,
    });
    assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME', JSON.stringify(overrides));
  }
});

test('buildPreviewDiffPlan falls back to keyframe for large text replacement', () => {
  const baseText = 'a'.repeat(120);
  const state = makeState({ text: baseText });
  const nextPreview = makePreview({ text: 'b'.repeat(120) });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
  });
  assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME');
});

test('buildDiffOps does not split surrogate pair when emoji is replaced', () => {
  const state = makeState({ text: 'abc\uD83C\uDFB2' });
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
  const state = makeState({ text: 'hi\uD83C\uDFB2' });
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
  const state = makeState({ text: head + 'a' + tail });
  const nextPreview = makePreview({ text: head + 'b' + tail });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
  });
  assert.strictEqual(plan.type, 'FALLBACK_TO_KEYFRAME');
});

test('buildPreviewDiffPlan falls back to keyframe when latestVersion would exceed u16', () => {
  const state = makeState({}, { latestVersion: 65_535 });
  const nextPreview = makePreview({ text: 'hello world' });
  const plan = buildPreviewDiffPlan({
    channelId,
    currentSendState: state,
    nextPreview,
    now: 1_100,
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
  assert.strictEqual(
    nextKeyframeVersion({ ...initialState, latestVersion: 65_535 }, preview.id),
    1,
  );
});
