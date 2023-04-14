import { makeId } from 'utils';
import { ComposeAction, ComposeActionUnion } from './actions/compose';

export type ComposeError = 'TEXT_EMPTY' | 'NO_NAME';

export type ComposeRange = [number, number] | null;

export interface ComposeState {
  inputedName: string;
  previewId: string | null;
  isAction: boolean;
  inGame: boolean;
  broadcast: boolean;
  source: string;
  media: File | undefined;
  error: ComposeError | null;
  range: ComposeRange;
}

const isSameRange = (a: ComposeRange, b: ComposeRange) => {
  if (a === b) {
    return true;
  }
  if (a === null || b === null) return false;
  const [a0, a1] = a;
  const [b0, b1] = b;
  return a0 === a1 && b0 === b1;
};

export const initialComposeState: ComposeState = {
  inputedName: '',
  previewId: null,
  isAction: false,
  inGame: false,
  broadcast: false,
  source: '',
  media: undefined,
  error: 'TEXT_EMPTY',
  range: null,
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

const handleSetInputedName = (
  state: ComposeState,
  { payload: { inputedName } }: ComposeAction<'setInputedName'>,
): ComposeState => {
  return { ...state, inputedName };
};

const handleSetRange = (state: ComposeState, { payload: { range } }: ComposeAction<'setRange'>): ComposeState => {
  if (isSameRange(state.range, range)) {
    return state;
  }
  return { ...state, range };
};

const composeSwitch = (state: ComposeState, action: ComposeActionUnion): ComposeState => {
  switch (action.type) {
    case 'setSource':
      return handleSetComposeSource(state, action);
    case 'setInputedName':
      return handleSetInputedName(state, action);
    case 'toggleInGame':
      return handleToggleInGame(state, action);
    case 'recoverState':
      return handleRecoverState(state, action);
    case 'addDice':
      return handleAddDice(state, action);
    case 'setRange':
      return handleSetRange(state, action);
    default:
      return state;
  }
};

const checkCompose = (
  { source, inputedName, inGame }: ComposeState,
): ComposeError | null => {
  if (inGame && inputedName.trim() === '') {
    return 'NO_NAME';
  }
  if (source.trim() === '') {
    return 'TEXT_EMPTY';
  }
  return null;
};

export const composeReducer = (state: ComposeState, action: ComposeActionUnion): ComposeState => {
  const nextState = composeSwitch(state, action);
  if (nextState === state) {
    return nextState;
  }
  const error = checkCompose(nextState);
  return { ...nextState, error };
};
