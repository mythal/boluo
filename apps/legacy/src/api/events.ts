import type {
  ClientEvent,
  EventId,
  Preview,
  PreviewDiff,
  PreviewDiffOp,
  PreviewDiffPost,
  PreviewEdit,
  PreviewPost,
  Update,
  UpdateBody,
  UpdateLifetime,
} from '@boluo/api';

export type Events = Update;
export type EditPreview = PreviewEdit;
export type SendPreview = Extract<ClientEvent, { type: 'PREVIEW' }>;
export type SendStatus = Extract<ClientEvent, { type: 'STATUS' }>;
export type {
  ClientEvent,
  EventId,
  Preview,
  PreviewDiff,
  PreviewDiffOp,
  PreviewDiffPost,
  PreviewEdit,
  PreviewPost,
  UpdateLifetime,
};

export type ConnectionError = Extract<UpdateBody, { type: 'ERROR' }>;
export type SpaceUpdated = Extract<UpdateBody, { type: 'SPACE_UPDATED' }>;
export type Initialized = Extract<UpdateBody, { type: 'INITIALIZED' }>;
export type NewMessage = Extract<UpdateBody, { type: 'NEW_MESSAGE' }>;
export type MessageDeleted = Extract<UpdateBody, { type: 'MESSAGE_DELETED' }>;
export type MessageEdited = Extract<UpdateBody, { type: 'MESSAGE_EDITED' }>;
export type MessagePreview = Extract<UpdateBody, { type: 'MESSAGE_PREVIEW' }>;
export type PreviewDiffUpdate = Extract<UpdateBody, { type: 'DIFF' }>;
export type AppUpdated = Extract<UpdateBody, { type: 'APP_UPDATED' }>;
export type ChannelEdited = Extract<UpdateBody, { type: 'CHANNEL_EDITED' }>;
export type ChannelDeleted = Extract<UpdateBody, { type: 'CHANNEL_DELETED' }>;
export type PushMembers = Extract<UpdateBody, { type: 'MEMBERS' }>;
export type StatusMap = Extract<UpdateBody, { type: 'STATUS_MAP' }>;

export const isEmptyPreview = (preview: Preview): boolean =>
  preview.text === '' ||
  (preview.text != null && (preview.entities == null || preview.entities.length === 0));

export const shouldAdvanceCursor = (event: Events): boolean =>
  event.live == null || event.live === 'P';

export const compareEvents = (a: EventId, b: EventId): number => {
  if (a.timestamp !== b.timestamp) {
    return a.timestamp - b.timestamp;
  } else if (a.node !== b.node) {
    return a.node - b.node;
  } else {
    return a.seq - b.seq;
  }
};

export const eventIdMax = (a: EventId, b: EventId): EventId => {
  if (compareEvents(a, b) < 0) {
    return b;
  } else {
    return a;
  }
};

export const eventIdMin = (a: EventId, b: EventId): EventId => {
  if (compareEvents(a, b) < 0) {
    return a;
  } else {
    return b;
  }
};
