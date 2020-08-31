import { Dispatch } from '../../../store';
import {
  allowImageType,
  fileSizeExceeded,
  formatIsNotSupported,
  imageFormatIsNotSupported,
  imageSizeExceeded,
  maxImageFileSize,
} from '../../../validators';
import { showFlash } from '../../../actions/flash';
import { Id, newId } from '../../../utils/id';
import { ClientEvent, PreviewPost } from '../../../api/events';
import { Entity } from '../../../interpreter/entities';

export interface ComposeState {
  appDispatch: Dispatch;
  sendEvent: (event: ClientEvent) => void;
  nickname: string;
  messageId: Id;
  editFor?: number;
  sending: boolean;
  inGame: boolean;
  broadcast: boolean;
  isAction: boolean;
  text: string;
  entities: Entity[];
  inputName: string;
  clear: boolean;
  initial: boolean;
  media: File | undefined;
  canSubmit?: boolean;
}

export interface Update {
  type: 'UPDATE';
  next: Partial<ComposeState>;
}

export const update = (next: Partial<ComposeState>): Update => ({
  type: 'UPDATE',
  next,
});

export interface Send {
  type: 'SEND';
}

export type ComposeAction = Update | Send;

export type ComposeDispatch = (action: ComposeAction) => void;

export type ComposeReducer<A extends ComposeAction = ComposeAction> = (state: ComposeState, action: A) => ComposeState;

const handleUpdate: ComposeReducer<Update> = (state, action) => {
  const dispatch = state.appDispatch;
  const { next } = action;
  if (next.media) {
    const file = next.media;
    if (file.size > maxImageFileSize) {
      dispatch(showFlash('WARNING', fileSizeExceeded));
      return state;
    } else if (file.type.startsWith('image')) {
      if (allowImageType.includes(file.type)) {
        if (file.size > maxImageFileSize) {
          dispatch(showFlash('WARNING', imageSizeExceeded));
          return state;
        }
      } else {
        dispatch(showFlash('WARNING', imageFormatIsNotSupported));
        return state;
      }
    } else {
      dispatch(showFlash('WARNING', formatIsNotSupported));
      return state;
    }
  }

  if (next.text === '' && !state.editFor) {
    next.messageId = newId();
  }
  const nextState = { ...state, ...next, initial: false };
  const { inGame, isAction, editFor, broadcast, text, inputName, entities, sending, nickname, clear } = nextState;
  const name = inGame ? inputName : nickname;
  const preview: PreviewPost = {
    id: nextState.messageId,
    name,
    inGame,
    isAction,
    mediaId: null,
    editFor,
    clear,
    text: broadcast || text === '' ? text : null,
    entities: broadcast ? entities : [],
  };
  nextState.canSubmit = text !== '' && (!inGame || inputName !== '') && !sending;
  nextState.sendEvent({ type: 'PREVIEW', preview });

  return nextState;
};

export const composeReducer: ComposeReducer = (state, action) => {
  if (action.type === 'UPDATE') {
    return handleUpdate(state, action);
  }
  return state;
};
