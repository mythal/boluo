import type { ClientEvent, PreviewPost } from '@boluo/types/bindings';
import {
  expectedPreviewDiffAcknowledgement,
  expectedPreviewKeyframeAcknowledgement,
  matchesPreviewAcknowledgement,
  PREVIEW_ACK_TIMEOUT_CLOSE_CODE,
  PREVIEW_ACK_TIMEOUT_CLOSE_REASON,
  PREVIEW_ACK_TIMEOUT_MS,
  type ExpectedPreviewAcknowledgement,
  type PreviewAcknowledgement,
} from './ack';
import {
  buildPreviewDiffPlan,
  nextKeyframeVersion,
  type PreviewSendState,
  toPreviewSendState,
} from './diff';

export type DesiredPreview = {
  preview: PreviewPost;
};

type PendingPreviewSend<Connection extends object> = {
  id: number;
  connection: Connection;
  connectionEpoch: number;
  event: ClientEvent;
  nextSendState: PreviewSendState;
  expectedAcknowledgement: ExpectedPreviewAcknowledgement;
};

type PendingPreviewAcknowledgement<Connection extends object> = {
  id: number;
  connection: Connection;
  connectionEpoch: number;
  expected: ExpectedPreviewAcknowledgement;
};

export type PreviewPublisherState<Connection extends object> = {
  desired: DesiredPreview | null;
  connection: Connection | null;
  connectionEpoch: number;
  initialized: boolean;
  enabled: boolean;
  // Advanced after a successful transport send; acknowledgement only checks the server echo.
  sendState: PreviewSendState | null;
  needsKeyframe: boolean;
  pendingSend: PendingPreviewSend<Connection> | null;
  // Only the latest acknowledgement is tracked.
  pendingAcknowledgement: PendingPreviewAcknowledgement<Connection> | null;
  flushRevision: number;
  nextId: number;
  // Prevent repeated timeout reconnects until an acknowledgement succeeds.
  canReconnectOnAcknowledgementTimeout: boolean;
  disposed: boolean;
};

export type PreviewPublisherAction<Connection extends object> =
  | {
      type: 'DESIRED_PREVIEW_CHANGED';
      desired: DesiredPreview;
    }
  | {
      type: 'CONNECTION_STATE_CHANGED';
      connection: Connection | null;
      initialized: boolean;
    }
  | {
      type: 'ENABLED_CHANGED';
      enabled: boolean;
    }
  | {
      type: 'FLUSH_DUE';
      revision: number;
      now: number;
    }
  | {
      type: 'SEND_SUCCEEDED';
      sendId: number;
      connectionEpoch: number;
    }
  | {
      type: 'SEND_FAILED';
      sendId: number;
      connectionEpoch: number;
    }
  | {
      type: 'ACKNOWLEDGEMENT_RECEIVED';
      source: object;
      acknowledgement: PreviewAcknowledgement;
    }
  | {
      type: 'ACKNOWLEDGEMENT_TIMEOUT';
      acknowledgementId: number;
      connectionEpoch: number;
    }
  | {
      type: 'ACTIVATED';
    }
  | {
      type: 'DISPOSED';
    };

export type PreviewPublisherCommand<Connection extends object> =
  | {
      type: 'SCHEDULE_FLUSH';
      revision: number;
      delay: number;
    }
  | {
      type: 'CANCEL_FLUSH';
    }
  | {
      type: 'SEND_EVENT';
      sendId: number;
      connectionEpoch: number;
      connection: Connection;
      event: ClientEvent;
    }
  | {
      type: 'SCHEDULE_ACKNOWLEDGEMENT_TIMEOUT';
      acknowledgementId: number;
      connectionEpoch: number;
      delay: number;
    }
  | {
      type: 'CANCEL_ACKNOWLEDGEMENT_TIMEOUT';
    }
  | {
      type: 'REQUEST_RECONNECT';
      connection: Connection;
      code: number;
      reason: string;
    };

export type PreviewPublisherReducerResult<Connection extends object> = {
  state: PreviewPublisherState<Connection>;
  commands: PreviewPublisherCommand<Connection>[];
};

export const makeInitialPreviewPublisherState = <
  Connection extends object,
>(): PreviewPublisherState<Connection> => ({
  desired: null,
  connection: null,
  connectionEpoch: 0,
  initialized: false,
  enabled: false,
  sendState: null,
  needsKeyframe: false,
  pendingSend: null,
  pendingAcknowledgement: null,
  flushRevision: 0,
  nextId: 0,
  canReconnectOnAcknowledgementTimeout: true,
  disposed: false,
});

const unchanged = <Connection extends object>(
  state: PreviewPublisherState<Connection>,
): PreviewPublisherReducerResult<Connection> => ({ state, commands: [] });

const canFlush = <Connection extends object>(state: PreviewPublisherState<Connection>): boolean =>
  !state.disposed &&
  state.desired != null &&
  state.connection != null &&
  state.initialized &&
  state.enabled &&
  state.pendingSend == null;

const scheduleFlush = <Connection extends object>(
  state: PreviewPublisherState<Connection>,
  delay: number,
  commands: PreviewPublisherCommand<Connection>[] = [],
): PreviewPublisherReducerResult<Connection> => {
  if (!canFlush(state)) {
    return { state, commands };
  }
  const revision = state.flushRevision + 1;
  return {
    state: { ...state, flushRevision: revision },
    commands: [...commands, { type: 'SCHEDULE_FLUSH', revision, delay }],
  };
};

const makeKeyframeSend = (
  desired: DesiredPreview,
  currentSendState: PreviewSendState | null,
  now: number,
): {
  event: ClientEvent;
  nextSendState: PreviewSendState;
  expectedAcknowledgement: ExpectedPreviewAcknowledgement;
} => {
  const version = nextKeyframeVersion(currentSendState, desired.preview.id);
  const preview: PreviewPost = { ...desired.preview, v: version };
  return {
    event: { type: 'PREVIEW', preview },
    nextSendState: toPreviewSendState(preview, version, now),
    expectedAcknowledgement: expectedPreviewKeyframeAcknowledgement(preview),
  };
};

export const previewPublisherReducer = <Connection extends object>(
  state: PreviewPublisherState<Connection>,
  action: PreviewPublisherAction<Connection>,
  debounceMs: number,
): PreviewPublisherReducerResult<Connection> => {
  if (action.type === 'ACTIVATED') {
    return state.disposed
      ? unchanged(makeInitialPreviewPublisherState<Connection>())
      : unchanged(state);
  }
  if (state.disposed && action.type !== 'DISPOSED') {
    return unchanged(state);
  }

  switch (action.type) {
    case 'DESIRED_PREVIEW_CHANGED':
      return scheduleFlush({ ...state, desired: action.desired }, debounceMs);

    case 'CONNECTION_STATE_CHANGED': {
      const connectionChanged = state.connection !== action.connection;
      const sessionReset = state.initialized && !action.initialized;
      if (!connectionChanged && !sessionReset && state.initialized === action.initialized) {
        return unchanged(state);
      }
      const resetProtocol = connectionChanged || sessionReset;
      const nextState: PreviewPublisherState<Connection> = {
        ...state,
        connection: action.connection,
        connectionEpoch: resetProtocol ? state.connectionEpoch + 1 : state.connectionEpoch,
        initialized: action.initialized,
        sendState: resetProtocol ? null : state.sendState,
        pendingSend: resetProtocol ? null : state.pendingSend,
        pendingAcknowledgement: resetProtocol ? null : state.pendingAcknowledgement,
        flushRevision: resetProtocol ? state.flushRevision + 1 : state.flushRevision,
      };
      const commands: PreviewPublisherCommand<Connection>[] = resetProtocol
        ? [{ type: 'CANCEL_FLUSH' }, { type: 'CANCEL_ACKNOWLEDGEMENT_TIMEOUT' }]
        : [];
      return scheduleFlush(nextState, debounceMs, commands);
    }

    case 'ENABLED_CHANGED': {
      if (state.enabled === action.enabled) {
        return unchanged(state);
      }
      const nextState = {
        ...state,
        enabled: action.enabled,
        needsKeyframe: action.enabled || state.needsKeyframe,
      };
      if (!action.enabled) {
        return {
          state: {
            ...nextState,
            flushRevision: nextState.flushRevision + 1,
          },
          commands: [{ type: 'CANCEL_FLUSH' }],
        };
      }
      return scheduleFlush(nextState, debounceMs);
    }

    case 'FLUSH_DUE': {
      if (action.revision !== state.flushRevision || !canFlush(state)) {
        return unchanged(state);
      }
      const { desired, connection } = state;
      if (desired == null || connection == null) {
        return unchanged(state);
      }

      let plannedSend:
        | {
            event: ClientEvent;
            nextSendState: PreviewSendState;
            expectedAcknowledgement: ExpectedPreviewAcknowledgement;
          }
        | undefined;
      if (state.sendState != null && !state.needsKeyframe) {
        const plan = buildPreviewDiffPlan({
          channelId: desired.preview.channelId,
          currentSendState: state.sendState,
          nextPreview: desired.preview,
          now: action.now,
        });
        if (plan.type === 'NOOP') {
          return unchanged(state);
        }
        if (plan.type === 'DIFF') {
          plannedSend = {
            event: { type: 'DIFF', preview: plan.diff },
            nextSendState: plan.nextState,
            expectedAcknowledgement: expectedPreviewDiffAcknowledgement(plan.diff),
          };
        }
      }
      plannedSend ??= makeKeyframeSend(desired, state.sendState, action.now);

      const sendId = state.nextId + 1;
      const pendingSend: PendingPreviewSend<Connection> = {
        id: sendId,
        connection,
        connectionEpoch: state.connectionEpoch,
        ...plannedSend,
      };
      return {
        state: {
          ...state,
          nextId: sendId,
          pendingSend,
        },
        commands: [
          {
            type: 'SEND_EVENT',
            sendId,
            connectionEpoch: state.connectionEpoch,
            connection,
            event: plannedSend.event,
          },
        ],
      };
    }

    case 'SEND_SUCCEEDED': {
      const pending = state.pendingSend;
      if (
        pending == null ||
        pending.id !== action.sendId ||
        pending.connectionEpoch !== action.connectionEpoch ||
        state.connectionEpoch !== action.connectionEpoch
      ) {
        return unchanged(state);
      }
      const acknowledgementId = state.nextId + 1;
      return {
        state: {
          ...state,
          nextId: acknowledgementId,
          sendState: pending.nextSendState,
          needsKeyframe: pending.event.type === 'PREVIEW' ? false : state.needsKeyframe,
          pendingSend: null,
          pendingAcknowledgement: {
            id: acknowledgementId,
            connection: pending.connection,
            connectionEpoch: pending.connectionEpoch,
            expected: pending.expectedAcknowledgement,
          },
        },
        commands: [
          {
            type: 'SCHEDULE_ACKNOWLEDGEMENT_TIMEOUT',
            acknowledgementId,
            connectionEpoch: pending.connectionEpoch,
            delay: PREVIEW_ACK_TIMEOUT_MS,
          },
        ],
      };
    }

    case 'SEND_FAILED': {
      const pending = state.pendingSend;
      if (
        pending == null ||
        pending.id !== action.sendId ||
        pending.connectionEpoch !== action.connectionEpoch
      ) {
        return unchanged(state);
      }
      return unchanged({ ...state, pendingSend: null });
    }

    case 'ACKNOWLEDGEMENT_RECEIVED': {
      const pending = state.pendingAcknowledgement;
      if (
        pending == null ||
        pending.connection !== action.source ||
        state.connection !== action.source ||
        !matchesPreviewAcknowledgement(pending.expected, action.acknowledgement)
      ) {
        return unchanged(state);
      }
      return {
        state: {
          ...state,
          pendingAcknowledgement: null,
          canReconnectOnAcknowledgementTimeout: true,
        },
        commands: [{ type: 'CANCEL_ACKNOWLEDGEMENT_TIMEOUT' }],
      };
    }

    case 'ACKNOWLEDGEMENT_TIMEOUT': {
      const pending = state.pendingAcknowledgement;
      if (
        pending == null ||
        pending.id !== action.acknowledgementId ||
        pending.connectionEpoch !== action.connectionEpoch ||
        state.connectionEpoch !== action.connectionEpoch
      ) {
        return unchanged(state);
      }
      const shouldReconnect = state.canReconnectOnAcknowledgementTimeout;
      return {
        state: {
          ...state,
          sendState: null,
          pendingAcknowledgement: null,
          canReconnectOnAcknowledgementTimeout: false,
        },
        commands: shouldReconnect
          ? [
              {
                type: 'REQUEST_RECONNECT',
                connection: pending.connection,
                code: PREVIEW_ACK_TIMEOUT_CLOSE_CODE,
                reason: PREVIEW_ACK_TIMEOUT_CLOSE_REASON,
              },
            ]
          : [],
      };
    }

    case 'DISPOSED':
      if (state.disposed) {
        return unchanged(state);
      }
      return {
        state: {
          ...state,
          desired: null,
          connection: null,
          sendState: null,
          pendingSend: null,
          pendingAcknowledgement: null,
          disposed: true,
        },
        commands: [{ type: 'CANCEL_FLUSH' }, { type: 'CANCEL_ACKNOWLEDGEMENT_TIMEOUT' }],
      };
  }
};

export type PreviewPublisherRuntimeDeps<Connection extends object, TimerHandle> = {
  debounceMs: number;
  now: () => number;
  send: (connection: Connection, event: ClientEvent) => boolean;
  setTimer: (callback: () => void, delay: number) => TimerHandle;
  clearTimer: (handle: TimerHandle) => void;
  requestReconnect: (connection: Connection, code: number, reason: string) => void;
  onSendError?: (error: unknown) => void;
};

export type PreviewPublisher<Connection extends object> = {
  dispatch: (action: PreviewPublisherAction<Connection>) => void;
  getState: () => PreviewPublisherState<Connection>;
  activate: () => void;
  dispose: () => void;
};

export const createPreviewPublisher = <Connection extends object, TimerHandle>(
  deps: PreviewPublisherRuntimeDeps<Connection, TimerHandle>,
): PreviewPublisher<Connection> => {
  let state = makeInitialPreviewPublisherState<Connection>();
  let flushTimer: TimerHandle | null = null;
  let acknowledgementTimer: TimerHandle | null = null;

  const clearFlushTimer = (): void => {
    if (flushTimer == null) return;
    deps.clearTimer(flushTimer);
    flushTimer = null;
  };
  const clearAcknowledgementTimer = (): void => {
    if (acknowledgementTimer == null) return;
    deps.clearTimer(acknowledgementTimer);
    acknowledgementTimer = null;
  };

  const dispatch = (action: PreviewPublisherAction<Connection>): void => {
    const result = previewPublisherReducer(state, action, deps.debounceMs);
    state = result.state;
    for (const command of result.commands) {
      switch (command.type) {
        case 'SCHEDULE_FLUSH':
          clearFlushTimer();
          flushTimer = deps.setTimer(() => {
            flushTimer = null;
            dispatch({
              type: 'FLUSH_DUE',
              revision: command.revision,
              now: deps.now(),
            });
          }, command.delay);
          break;
        case 'CANCEL_FLUSH':
          clearFlushTimer();
          break;
        case 'SEND_EVENT': {
          let sent = false;
          try {
            sent = deps.send(command.connection, command.event);
          } catch (error) {
            deps.onSendError?.(error);
          }
          dispatch({
            type: sent ? 'SEND_SUCCEEDED' : 'SEND_FAILED',
            sendId: command.sendId,
            connectionEpoch: command.connectionEpoch,
          });
          break;
        }
        case 'SCHEDULE_ACKNOWLEDGEMENT_TIMEOUT':
          clearAcknowledgementTimer();
          acknowledgementTimer = deps.setTimer(() => {
            acknowledgementTimer = null;
            dispatch({
              type: 'ACKNOWLEDGEMENT_TIMEOUT',
              acknowledgementId: command.acknowledgementId,
              connectionEpoch: command.connectionEpoch,
            });
          }, command.delay);
          break;
        case 'CANCEL_ACKNOWLEDGEMENT_TIMEOUT':
          clearAcknowledgementTimer();
          break;
        case 'REQUEST_RECONNECT':
          deps.requestReconnect(command.connection, command.code, command.reason);
          break;
      }
    }
  };

  return {
    dispatch,
    getState: () => state,
    activate: () => dispatch({ type: 'ACTIVATED' }),
    dispose: () => dispatch({ type: 'DISPOSED' }),
  };
};
