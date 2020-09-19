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

export interface UserItem {
  label: string;
  value: string;
}

export interface ComposeState {
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
  canSubmit: boolean;
  prevSubmit?: number;
  whisperTo?: UserItem[] | null;
}

export interface Context {
  sendEvent: (event: ClientEvent) => void;
  dispatch: Dispatch;
  nickname: string;
  characterName: string;
}

export interface Update {
  type: 'UPDATE';
  next: Partial<ComposeState>;
}

export const update = (next: Partial<ComposeState>): Update => {
  return {
    type: 'UPDATE',
    next,
  };
};

export interface Send {
  type: 'SEND';
}

export type ComposeAction = Update | Send;

export type ComposeDispatch = (action: ComposeAction) => void;

export type ComposeReducer<A extends ComposeAction = ComposeAction> = (
  context: Context,
  state: ComposeState,
  action: A
) => ComposeState;

const handleUpdate: ComposeReducer<Update> = (context, state, action) => {
  const { dispatch, characterName, nickname, sendEvent } = context;
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

  if (!state.editFor) {
    if (state.text === '' && next.text !== '') {
      next.messageId = newId();
    }
  }
  const nextState = { ...state, ...next, initial: false };
  if (
    [
      next.inputName,
      next.inGame,
      next.isAction,
      next.editFor,
      next.broadcast,
      next.text,
      next.entities,
      next.clear,
    ].some((value) => value !== undefined)
  ) {
    let text: string | null = nextState.text;
    const { inGame, isAction, editFor, broadcast, inputName, entities, sending, clear } = nextState;
    if (!broadcast && text !== '') {
      text = null;
    }
    if (!broadcast && entities.length === 0) {
      text = '';
    }
    const name = inGame ? inputName || characterName : nickname;
    const preview: PreviewPost = {
      id: nextState.messageId,
      name,
      inGame,
      isAction,
      mediaId: null,
      editFor,
      clear,
      text,
      entities: broadcast ? entities : [],
    };
    if (nextState.whisperTo !== null && nextState.whisperTo !== undefined) {
      preview.text = '';
      preview.entities = [];
    }
    nextState.canSubmit = calculateCanSubmit(nextState.text, inGame, inputName || characterName) && !sending;
    sendEvent({ type: 'PREVIEW', preview });
  }

  return nextState;
};

export const calculateCanSubmit = (text: string, inGame: boolean, characterName: string): boolean =>
  text !== '' && (!inGame || characterName !== '');

export const composeReducerMaker = (context: Context) => (state: ComposeState, action: ComposeAction) => {
  if (action.type === 'UPDATE') {
    return handleUpdate(context, state, action);
  }
  return state;
};
