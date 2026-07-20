import type { PreviewDiffPost, PreviewPost, Update } from '@boluo/types/bindings';
import { equalPreviewEdit } from './diff';

export const PREVIEW_ACK_TIMEOUT_MS = 15_000;
export const PREVIEW_ACK_TIMEOUT_CLOSE_CODE = 4000;
export const PREVIEW_ACK_TIMEOUT_CLOSE_REASON = 'preview acknowledgement timeout';

type PreviewKeyframeAcknowledgementTarget = {
  previewId: string;
  version: number;
  channelId: string;
  name: string;
  mediaId: string | null;
  text: string | null;
  inGame: boolean;
  isAction: boolean;
  clear: boolean;
  editFor: string | null;
  edit: PreviewPost['edit'];
};

// Version and content fields identify the keyframe echo; entities are omitted.
type PreviewKeyframeAcknowledgementInput = {
  id: string;
  v?: number;
  channelId: string;
  name: string;
  mediaId?: string | null;
  text?: string | null;
  inGame?: boolean;
  isAction?: boolean;
  clear?: boolean;
  editFor?: string | null;
  edit?: PreviewPost['edit'];
};

export type PreviewAcknowledgement =
  | ({ type: 'KEYFRAME' } & PreviewKeyframeAcknowledgementTarget)
  | {
      type: 'DIFF';
      channelId: string;
      previewId: string;
      keyframeVersion: number;
      version: number;
    };

export type ExpectedPreviewAcknowledgement = PreviewAcknowledgement;

export type PreviewAcknowledgementEvent = {
  // Opaque transport identity used to reject acknowledgements from stale connections.
  source: object;
  acknowledgement: PreviewAcknowledgement;
};

const toPreviewKeyframeAcknowledgementTarget = (
  preview: PreviewKeyframeAcknowledgementInput,
): PreviewKeyframeAcknowledgementTarget => ({
  previewId: preview.id,
  version: preview.v ?? 0,
  channelId: preview.channelId,
  name: preview.name,
  mediaId: preview.mediaId ?? null,
  text: preview.text ?? null,
  inGame: preview.inGame ?? false,
  isAction: preview.isAction ?? false,
  clear: preview.clear ?? false,
  // The server derives editFor from edit.time before echoing an edit preview.
  editFor: preview.edit?.time ?? preview.editFor ?? null,
  edit: preview.edit ?? null,
});

export const expectedPreviewKeyframeAcknowledgement = (
  preview: PreviewPost,
): ExpectedPreviewAcknowledgement => ({
  type: 'KEYFRAME',
  ...toPreviewKeyframeAcknowledgementTarget(preview),
});

export const expectedPreviewDiffAcknowledgement = (
  diff: PreviewDiffPost,
): ExpectedPreviewAcknowledgement => ({
  type: 'DIFF',
  channelId: diff.ch,
  previewId: diff.id,
  keyframeVersion: diff.ref,
  version: diff.v ?? 0,
});

export const extractOwnPreviewAcknowledgement = (
  update: Update,
  userId: string | null | undefined,
): PreviewAcknowledgement | null => {
  if (userId == null) return null;
  const { body } = update;
  if (body.type === 'MESSAGE_PREVIEW') {
    if (body.preview.senderId !== userId) return null;
    return {
      type: 'KEYFRAME',
      ...toPreviewKeyframeAcknowledgementTarget(body.preview),
    };
  }
  if (body.type === 'DIFF') {
    if (body.diff.sender !== userId) return null;
    return {
      type: 'DIFF',
      channelId: body.diff._.ch,
      previewId: body.diff._.id,
      keyframeVersion: body.diff._.ref,
      version: body.diff._.v ?? 0,
    };
  }
  return null;
};

const equalPreviewKeyframeAcknowledgement = (
  left: PreviewKeyframeAcknowledgementTarget,
  right: PreviewKeyframeAcknowledgementTarget,
): boolean =>
  left.previewId === right.previewId &&
  left.version === right.version &&
  left.channelId === right.channelId &&
  left.name === right.name &&
  left.mediaId === right.mediaId &&
  left.text === right.text &&
  left.inGame === right.inGame &&
  left.isAction === right.isAction &&
  left.clear === right.clear &&
  left.editFor === right.editFor &&
  equalPreviewEdit(left.edit, right.edit);

export const matchesPreviewAcknowledgement = (
  expected: ExpectedPreviewAcknowledgement,
  acknowledgement: PreviewAcknowledgement,
): boolean => {
  if (expected.type !== acknowledgement.type) return false;
  if (expected.type === 'KEYFRAME' && acknowledgement.type === 'KEYFRAME') {
    return equalPreviewKeyframeAcknowledgement(expected, acknowledgement);
  }
  if (expected.type === 'DIFF' && acknowledgement.type === 'DIFF') {
    return (
      expected.channelId === acknowledgement.channelId &&
      expected.previewId === acknowledgement.previewId &&
      expected.keyframeVersion === acknowledgement.keyframeVersion &&
      expected.version === acknowledgement.version
    );
  }
  return false;
};

type PreviewAcknowledgementListener = (event: PreviewAcknowledgementEvent) => void;

const acknowledgementListeners = new Set<PreviewAcknowledgementListener>();

export const subscribePreviewAcknowledgement = (
  listener: PreviewAcknowledgementListener,
): (() => void) => {
  acknowledgementListeners.add(listener);
  return () => acknowledgementListeners.delete(listener);
};

export const publishOwnPreviewAcknowledgement = (
  update: Update,
  userId: string | null | undefined,
  source: object,
): void => {
  const acknowledgement = extractOwnPreviewAcknowledgement(update, userId);
  if (acknowledgement == null) return;
  for (const listener of acknowledgementListeners) {
    listener({ source, acknowledgement });
  }
};
