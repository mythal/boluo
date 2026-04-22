import { type PreviewDiffOp, type PreviewDiffPost, type PreviewPost } from '@boluo/api';

export const SEND_KEYFRAME_INTERVAL_MS = 30_000;
export const SEND_KEYFRAME_LARGE_CHANGE_RATIO = 0.7;
export const SEND_KEYFRAME_LARGE_CHANGE_MIN_CHARS = 64;
// Server encodes splice index/len and diff version as u16.
const U16_MAX = 65_535;

export type PreviewKeyframe = {
  id: string;
  version: number;
  name: string;
  text: string | null;
  entities: PreviewPost['entities'];
  inGame: boolean;
  isAction: boolean;
  edit: PreviewPost['edit'];
};

// `latestVersion` is a single monotonic counter shared by keyframe.v and diff.v,
// so the receiver can compare them numerically to drop stale updates.
export type PreviewSendState = {
  keyframe: PreviewKeyframe;
  latestVersion: number;
  lastKeyframeAt: number;
};

type TextChangeStats = {
  changedChars: number;
  baselineChars: number;
};

type DiffBuildResult = {
  ops: PreviewDiffOp[];
  textChangeStats: TextChangeStats | null;
};

type PreviewDiffPlanInput = {
  channelId: string;
  currentSendState: PreviewSendState;
  nextPreview: PreviewPost;
  now: number;
  doNotBroadcast: boolean;
  resetPreview: boolean;
};

export type PreviewDiffPlan =
  | {
      type: 'DIFF';
      diff: PreviewDiffPost;
      nextState: PreviewSendState;
    }
  | {
      type: 'NOOP';
    }
  | {
      type: 'FALLBACK_TO_KEYFRAME';
    };

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

export const equalPreviewEdit = (a: PreviewPost['edit'], b: PreviewPost['edit']): boolean => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.time === b.time && a.p === b.p && a.q === b.q;
};

export const buildDiffOps = (
  keyframe: PreviewKeyframe,
  nextPreview: PreviewPost,
): DiffBuildResult | null => {
  const buildSplice = (
    baseText: string,
    nextText: string,
  ): { op: PreviewDiffOp; changedChars: number; baselineChars: number } | null => {
    let prefix = 0;
    const minLen = Math.min(baseText.length, nextText.length);
    while (prefix < minLen && baseText[prefix] === nextText[prefix]) {
      prefix += 1;
    }
    if (prefix === baseText.length && prefix === nextText.length) {
      return null;
    }
    let suffix = 0;
    const baseRemain = baseText.length - prefix;
    const nextRemain = nextText.length - prefix;
    while (
      suffix < baseRemain &&
      suffix < nextRemain &&
      baseText[baseText.length - 1 - suffix] === nextText[nextText.length - 1 - suffix]
    ) {
      suffix += 1;
    }
    // Avoid splitting a UTF-16 surrogate pair across the prefix/suffix boundary,
    // which would produce op text containing unpaired surrogates (rejected by serde).
    if (prefix > 0 && isHighSurrogate(baseText.charCodeAt(prefix - 1))) {
      prefix -= 1;
    }
    if (suffix > 0 && isLowSurrogate(baseText.charCodeAt(baseText.length - suffix))) {
      suffix -= 1;
    }
    const deleteCount = baseText.length - prefix - suffix;
    const insertText = nextText.slice(prefix, nextText.length - suffix);
    const changedChars = Math.max(deleteCount, insertText.length);
    const baselineChars = Math.max(baseText.length, nextText.length, 1);
    if (prefix === baseText.length && deleteCount === 0) {
      return {
        op: { type: 'A', _: insertText },
        changedChars,
        baselineChars,
      };
    }
    return {
      op: {
        type: 'SPLICE',
        i: prefix,
        len: deleteCount,
        _: insertText,
      },
      changedChars,
      baselineChars,
    };
  };

  const ops: PreviewDiffOp[] = [];
  let textChangeStats: TextChangeStats | null = null;
  if (keyframe.name !== nextPreview.name) {
    ops.push({ type: 'NAME', name: nextPreview.name });
  }
  if (keyframe.text !== nextPreview.text) {
    const baseText = keyframe.text;
    const nextText = nextPreview.text;
    if (baseText == null || nextText == null) {
      return null;
    }
    const splice = buildSplice(baseText, nextText);
    if (splice != null) {
      ops.push(splice.op);
      textChangeStats = {
        changedChars: splice.changedChars,
        baselineChars: splice.baselineChars,
      };
    }
  }
  return { ops, textChangeStats };
};

export const shouldFallbackToKeyframe = (
  keyframe: PreviewKeyframe,
  nextPreview: PreviewPost,
  doNotBroadcast: boolean,
  resetPreview: boolean,
): boolean => {
  if (keyframe.id !== nextPreview.id) return true;
  if (doNotBroadcast || resetPreview) return true;
  if (keyframe.inGame !== nextPreview.inGame) return true;
  if (keyframe.isAction !== nextPreview.isAction) return true;
  if (!equalPreviewEdit(keyframe.edit, nextPreview.edit)) return true;
  if (keyframe.text == null || nextPreview.text == null) return true;
  return false;
};

export const shouldFallbackLargeTextChange = (
  textChangeStats: TextChangeStats | null,
  ratio = SEND_KEYFRAME_LARGE_CHANGE_RATIO,
  minChars = SEND_KEYFRAME_LARGE_CHANGE_MIN_CHARS,
): boolean => {
  if (textChangeStats == null) return false;
  return (
    textChangeStats.changedChars >= minChars &&
    textChangeStats.changedChars / textChangeStats.baselineChars >= ratio
  );
};

export const toKeyframe = (preview: PreviewPost, version: number): PreviewKeyframe => ({
  id: preview.id,
  version,
  name: preview.name,
  text: preview.text,
  entities: preview.entities,
  inGame: preview.inGame ?? false,
  isAction: preview.isAction ?? false,
  edit: preview.edit,
});

export const nextKeyframeVersion = (
  currentSendState: PreviewSendState | null,
  previewId: string,
): number => {
  if (currentSendState == null || currentSendState.keyframe.id !== previewId) {
    return 1;
  }
  return currentSendState.latestVersion + 1;
};

export const toPreviewSendState = (
  preview: PreviewPost,
  version: number,
  now: number,
): PreviewSendState => ({
  keyframe: toKeyframe(preview, version),
  latestVersion: version,
  lastKeyframeAt: now,
});

export const buildPreviewDiffPlan = ({
  channelId,
  currentSendState,
  nextPreview,
  now,
  doNotBroadcast,
  resetPreview,
}: PreviewDiffPlanInput): PreviewDiffPlan => {
  const shouldForceKeyframe = now - currentSendState.lastKeyframeAt >= SEND_KEYFRAME_INTERVAL_MS;
  if (
    shouldForceKeyframe ||
    shouldFallbackToKeyframe(currentSendState.keyframe, nextPreview, doNotBroadcast, resetPreview)
  ) {
    return { type: 'FALLBACK_TO_KEYFRAME' };
  }
  const diffResult = buildDiffOps(currentSendState.keyframe, nextPreview);
  if (diffResult == null) {
    return { type: 'FALLBACK_TO_KEYFRAME' };
  }
  if (shouldFallbackLargeTextChange(diffResult.textChangeStats)) {
    return { type: 'FALLBACK_TO_KEYFRAME' };
  }
  if (diffResult.ops.length === 0) {
    return { type: 'NOOP' };
  }
  const version = currentSendState.latestVersion + 1;
  if (version > U16_MAX || currentSendState.keyframe.version > U16_MAX) {
    return { type: 'FALLBACK_TO_KEYFRAME' };
  }
  for (const op of diffResult.ops) {
    if (op.type === 'SPLICE' && (op.i > U16_MAX || op.len > U16_MAX)) {
      return { type: 'FALLBACK_TO_KEYFRAME' };
    }
  }
  const diff: PreviewDiffPost = {
    ch: channelId,
    id: currentSendState.keyframe.id,
    ref: currentSendState.keyframe.version,
    v: version,
    op: diffResult.ops,
  };
  if (nextPreview.entities.length > 0) {
    diff.xs = nextPreview.entities;
  }
  return {
    type: 'DIFF',
    diff,
    nextState: { ...currentSendState, latestVersion: version },
  };
};
