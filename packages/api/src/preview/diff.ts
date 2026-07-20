import type { Preview, PreviewDiffOp, PreviewDiffPost, PreviewPost } from '@boluo/types/bindings';

export const SEND_KEYFRAME_INTERVAL_MS = 30_000;
export const SEND_KEYFRAME_LARGE_CHANGE_RATIO = 0.7;
export const SEND_KEYFRAME_LARGE_CHANGE_MIN_CHARS = 64;
// Server encodes splice index/len and preview versions as u16.
const U16_MAX = 65_535;

export type PreviewDiffBase = {
  id: string;
  version: number;
  name: string;
  text: string | null;
  entities: PreviewPost['entities'];
};

export type PreviewSendKeyframe = PreviewDiffBase & {
  channelId: string;
  mediaId: PreviewPost['mediaId'];
  inGame: boolean;
  isAction: boolean;
  clear: boolean;
  editFor: PreviewPost['editFor'];
  edit: PreviewPost['edit'];
};

type PreviewDiffTarget = Pick<PreviewSendKeyframe, 'name' | 'text'>;

// `latestVersion` is shared by keyframe.v and diff.v, allowing receivers to
// discard stale updates by comparing one monotonically increasing counter.
export type PreviewSendState = {
  keyframe: PreviewSendKeyframe;
  // Diffs are based on `keyframe`, so this separate target distinguishes a
  // true no-op from reverting the receiver back to the keyframe's name/text.
  lastSentTarget: PreviewDiffTarget;
  latestVersion: number;
  lastKeyframeAt: number;
};

type PreviewContent = {
  text?: string | null;
  entities?: PreviewPost['entities'] | null;
};

export const isClearedPreviewContent = ({ text, entities }: PreviewContent): boolean =>
  text != null && (text.trim() === '' || entities == null || entities.length === 0);

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

const toPreviewDiffTarget = ({
  name,
  text,
}: Pick<PreviewPost, 'name' | 'text'>): PreviewDiffTarget => ({ name, text });

const equalPreviewTarget = (left: PreviewDiffTarget, right: PreviewDiffTarget): boolean =>
  left.name === right.name && left.text === right.text;

type DiffablePreviewKey = 'version' | 'name' | 'text' | 'entities';
type KeyframeOnlyPreviewKey = Exclude<keyof PreviewSendKeyframe, DiffablePreviewKey>;

const equalKeyframeOnlyPreviewTarget = (
  left: PreviewSendKeyframe,
  right: PreviewSendKeyframe,
): boolean =>
  Object.values({
    id: left.id === right.id,
    channelId: left.channelId === right.channelId,
    mediaId: left.mediaId === right.mediaId,
    inGame: left.inGame === right.inGame,
    isAction: left.isAction === right.isAction,
    clear: left.clear === right.clear,
    editFor: left.editFor === right.editFor,
    edit: equalPreviewEdit(left.edit, right.edit),
  } satisfies Record<KeyframeOnlyPreviewKey, boolean>).every(Boolean);

export const buildDiffOps = (
  keyframe: PreviewSendKeyframe,
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

    // Avoid creating op strings with unpaired UTF-16 surrogates, which serde
    // rejects when an edit boundary falls inside an emoji.
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

export const toPreviewDiffBase = (
  preview: Pick<Preview, 'id' | 'v' | 'name' | 'text' | 'entities'>,
): PreviewDiffBase => ({
  id: preview.id,
  version: preview.v ?? 0,
  name: preview.name,
  text: preview.text ?? null,
  entities: preview.entities,
});

export const applyPreviewDiffOps = (
  keyframe: PreviewDiffBase,
  ops: PreviewDiffOp[],
): { text: string | null; name: string } | null => {
  const baseText = keyframe.text;
  let nextText = baseText ?? '';
  let textChanged = false;
  let name = keyframe.name;
  for (const op of ops) {
    switch (op.type) {
      case 'SPLICE': {
        const start = op.i;
        const deleteCount = op.len;
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(deleteCount) ||
          start < 0 ||
          deleteCount < 0
        ) {
          return null;
        }
        const deleteEnd = start + deleteCount;
        if (start > nextText.length || deleteEnd > nextText.length) {
          return null;
        }
        nextText = nextText.slice(0, start) + op._ + nextText.slice(deleteEnd);
        textChanged = true;
        break;
      }
      case 'A':
        nextText += op._;
        textChanged = true;
        break;
      case 'NAME':
        name = op.name;
        break;
    }
  }
  if (textChanged && baseText == null) {
    return null;
  }
  return { text: textChanged ? nextText : baseText, name };
};

type ResolvePreviewDiffInput = {
  keyframe: PreviewDiffBase;
  currentVersion: number;
  diff: PreviewDiffPost;
  parseEntities: (text: string) => PreviewDiffBase['entities'];
  onParseError?: (error: unknown, text: string) => void;
};

export type ResolvedPreviewDiff = {
  name: string;
  text: string | null;
  entities: PreviewDiffBase['entities'];
  version: number;
};

export const resolvePreviewDiff = ({
  keyframe,
  currentVersion,
  diff,
  parseEntities,
  onParseError,
}: ResolvePreviewDiffInput): ResolvedPreviewDiff | null => {
  if (diff.id !== keyframe.id || diff.ref !== keyframe.version) {
    return null;
  }
  if (diff.v != null && diff.v <= currentVersion) {
    return null;
  }
  const result = applyPreviewDiffOps(keyframe, diff.op);
  if (result == null) {
    return null;
  }
  const { text, name } = result;
  let entities = keyframe.entities;
  if (diff.xs != null && diff.xs.length > 0) {
    entities = diff.xs;
  } else if (text != null) {
    try {
      entities = parseEntities(text);
    } catch (error) {
      onParseError?.(error, text);
    }
  }
  return {
    name,
    text,
    entities,
    version: diff.v ?? currentVersion,
  };
};

export const shouldFallbackToKeyframe = (
  keyframe: PreviewSendKeyframe,
  nextPreview: PreviewPost,
): boolean => {
  if (isClearedPreviewContent(nextPreview)) return true;
  const nextTarget = toPreviewSendKeyframe(nextPreview, 0);
  if (!equalKeyframeOnlyPreviewTarget(keyframe, nextTarget)) {
    return true;
  }
  if (keyframe.text == null || nextPreview.text == null) return true;
  // Clearing a preview also clears its server-side position. The next visible
  // preview needs a keyframe so the server allocates a fresh position.
  if (isClearedPreviewContent(keyframe)) return true;
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

export const toPreviewSendKeyframe = (
  preview: PreviewPost,
  version: number,
): PreviewSendKeyframe => ({
  id: preview.id,
  version,
  channelId: preview.channelId,
  name: preview.name,
  mediaId: preview.mediaId,
  text: preview.text,
  entities: preview.entities,
  inGame: preview.inGame ?? false,
  isAction: preview.isAction ?? false,
  clear: preview.clear ?? false,
  editFor: preview.editFor ?? null,
  edit: preview.edit ?? null,
});

export const nextKeyframeVersion = (
  currentSendState: PreviewSendState | null,
  previewId: string,
): number => {
  if (
    currentSendState == null ||
    currentSendState.keyframe.id !== previewId ||
    currentSendState.latestVersion >= U16_MAX
  ) {
    return 1;
  }
  return currentSendState.latestVersion + 1;
};

export const toPreviewSendState = (
  preview: PreviewPost,
  version: number,
  now: number,
): PreviewSendState => {
  const keyframe = toPreviewSendKeyframe(preview, version);
  return {
    keyframe,
    lastSentTarget: toPreviewDiffTarget(preview),
    latestVersion: version,
    lastKeyframeAt: now,
  };
};

export const buildPreviewDiffPlan = ({
  channelId,
  currentSendState,
  nextPreview,
  now,
}: PreviewDiffPlanInput): PreviewDiffPlan => {
  const shouldForceKeyframe = now - currentSendState.lastKeyframeAt >= SEND_KEYFRAME_INTERVAL_MS;
  if (shouldForceKeyframe || shouldFallbackToKeyframe(currentSendState.keyframe, nextPreview)) {
    return { type: 'FALLBACK_TO_KEYFRAME' };
  }
  const nextTarget = toPreviewDiffTarget(nextPreview);
  if (equalPreviewTarget(currentSendState.lastSentTarget, nextTarget)) {
    return { type: 'NOOP' };
  }

  const diffResult = buildDiffOps(currentSendState.keyframe, nextPreview);
  if (diffResult == null) {
    return { type: 'FALLBACK_TO_KEYFRAME' };
  }
  if (shouldFallbackLargeTextChange(diffResult.textChangeStats)) {
    return { type: 'FALLBACK_TO_KEYFRAME' };
  }
  // `op: []` is meaningful when reverting: receivers apply every diff to the
  // keyframe, so an empty patch restores its text and name.
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
    nextState: {
      ...currentSendState,
      lastSentTarget: nextTarget,
      latestVersion: version,
    },
  };
};
