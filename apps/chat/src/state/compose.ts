import { makeId } from 'utils';
import { ComposeAction, ComposeActionUnion } from './actions/compose';

export interface ComposeState {
  inputedName: string;
  previewId: string | null;
  isAction: boolean;
  inGame: boolean;
  broadcast: boolean;
  source: string;
  media: File | undefined;
}

export const initialComposeState: ComposeState = {
  inputedName: '',
  previewId: null,
  isAction: false,
  inGame: false,
  broadcast: false,
  source: '',
  media: undefined,
};

const handleSetComposeSource = (state: ComposeState, action: ComposeAction<'setSource'>): ComposeState => {
  const { source } = action.payload;
  let { previewId } = state;
  if (source === '' || (state.source === '' && source !== '')) {
    previewId = makeId();
  }
  return { ...state, source: action.payload.source, previewId };
};

const handleToggleInGame = (state: ComposeState, action: ComposeAction<'toggleInGame'>): ComposeState => {
  const inGame = !state.inGame;
  return { ...state, inGame };
};

const handleRecoverState = (state: ComposeState, action: ComposeAction<'recoverState'>): ComposeState => {
  return { ...action.payload, previewId: makeId(), media: undefined };
};

const handleAddDice = (state: ComposeState, action: ComposeAction<'addDice'>): ComposeState => {
  let { source } = state;
  if (source.trim().length === 0) {
    source = '{d} ';
  } else {
    source += ' {d} ';
  }
  return { ...state, source };
};

export const composeReducer = (state: ComposeState, action: ComposeActionUnion): ComposeState => {
  switch (action.type) {
    case 'setSource':
      return handleSetComposeSource(state, action);
    case 'toggleInGame':
      return handleToggleInGame(state, action);
    case 'recoverState':
      return handleRecoverState(state, action);
    case 'addDice':
      return handleAddDice(state, action);
    default:
      return state;
  }
};
