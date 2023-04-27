import { makeId } from 'utils';
import { parse, ParseResult } from '../interpreter/parser';
import { ComposeAction, ComposeActionUnion } from './actions/compose';

export type ComposeError = 'TEXT_EMPTY' | 'NO_NAME';

export type ComposeRange = [number, number];

export interface ComposeState {
  editFor: string | null;
  inputedName: string;
  previewId: string | null;
  isAction: boolean;
  inGame: boolean;
  broadcast: boolean;
  source: string;
  media: File | undefined;
  error: ComposeError | null;
  parsed: ParseResult;
  range: ComposeRange;
}

export const initialComposeState: ComposeState = {
  editFor: null,
  inputedName: '',
  previewId: null,
  isAction: false,
  inGame: false,
  broadcast: false,
  source: '',
  media: undefined,
  error: 'TEXT_EMPTY',
  range: [0, 0],
  parsed: { text: '', entities: [] },
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
  let range = state.range;
  if (source.trim().length === 0) {
    source = '{d} ';
    range = [source.length, source.length];
  } else if (!state.range) {
    source += ' {d} ';
    range = [source.length, source.length];
  } else {
    const [a, b] = state.range;
    if (a === b) {
      const left = source.substring(0, a);
      const right = source.substring(a);
      source = `${left} {d} `;
      range = [source.length, source.length];
      source += right;
    }
  }
  return { ...state, source, range };
};

const handleLink = (state: ComposeState, { payload: { href, text } }: ComposeAction<'link'>): ComposeState => {
  let { source, range } = state;
  if (!range) {
    range = [source.length, source.length];
  }
  const [a, b] = range;

  const insertText = `[${source.substring(a, b)}]()`;
  const head = source.substring(0, a);
  const tail = source.substring(b);
  source = `${head}${insertText}${tail}`;
  return { ...state, source, range: [head.length + 1, head.length + insertText.length - 3] };
};

const handleBold = (state: ComposeState, { payload }: ComposeAction<'bold'>): ComposeState => {
  let { source, range } = state;
  if (!range) {
    range = [source.length, source.length];
  }
  const [a, b] = range;

  const insertText = `**${source.substring(a, b)}**`;
  const head = source.substring(0, a);
  const tail = source.substring(b);
  source = `${head}${insertText}${tail}`;
  return { ...state, source, range: [head.length + 2, head.length + insertText.length - 2] };
};

const handleSetInputedName = (
  state: ComposeState,
  { payload: { inputedName } }: ComposeAction<'setInputedName'>,
): ComposeState => {
  return { ...state, inputedName };
};

const handleSetRange = (state: ComposeState, { payload: { range } }: ComposeAction<'setRange'>): ComposeState => {
  if (!range) {
    const end = state.source.length - 1;
    return { ...state, range: [end, end] };
  }
  if (range[0] > range[1]) {
    range = [range[1], range[0]];
  }
  const [a, b] = range;
  if (!state.range) {
    return { ...state, range };
  }
  if (state.range[0] === a && state.range[1] === b) {
    return state;
  }
  return { ...state, range };
};

const handleParsed = (state: ComposeState, { payload: parsed }: ComposeAction<'parsed'>): ComposeState => {
  const { text } = parsed;
  if (text !== state.source || text === state.parsed?.text) {
    return state;
  }
  return { ...state, parsed };
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
    case 'link':
      return handleLink(state, action);
    case 'bold':
      return handleBold(state, action);
    case 'setRange':
      return handleSetRange(state, action);
    case 'parsed':
      return handleParsed(state, action);
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
