import { makeId } from '@boluo/utils';
import { Modifier, parseModifiers } from '../interpreter/parser';
import { MediaError, validateMedia } from '../media';
import { ComposeAction, ComposeActionUnion } from './compose.actions';
import { DEFAULT_COMPOSE_SOURCE } from '../const';

export type ComposeError = 'TEXT_EMPTY' | 'NO_NAME' | MediaError;

export type ComposeRange = [number, number];

export interface ComposeState {
  editFor: string | null;
  inputedName: string;
  previewId: string;
  defaultInGame: boolean;
  source: string;
  media: File | string | null;
  whisperTo: // Represents whisper to the Game Master
  | null
    // Represents whisper to users (Game Master always can read all whisper messages)
    | string[]
    // Represents disabled whisper
    | undefined;
  focused: boolean;
  range: ComposeRange;
  backup?: ComposeState;
}

export const makeInitialComposeState = (): ComposeState => ({
  editFor: null,
  inputedName: '',
  previewId: makeId(),
  defaultInGame: true,
  source: DEFAULT_COMPOSE_SOURCE,
  media: null,
  range: [DEFAULT_COMPOSE_SOURCE.length, DEFAULT_COMPOSE_SOURCE.length],
  focused: false,
  whisperTo: undefined,
});

export const clearBackup = (state: ComposeState): ComposeState =>
  state.backup === undefined ? state : { ...state, backup: undefined };

const QUICK_CHECK_REGEX = /[.。](in|out)\b/i;

const handleSetComposeSource = (state: ComposeState, action: ComposeAction<'setSource'>): ComposeState => {
  const { source } = action.payload;
  let { previewId, defaultInGame } = state;
  if (QUICK_CHECK_REGEX.exec(source)) {
    const modifiersResult = parseModifiers(source);
    if (modifiersResult.inGame) {
      // Flip the default in-game state if the source has a explicit in-game modifier
      // So that users can flip the state by deleting the modifier
      defaultInGame = !modifiersResult.inGame.inGame;
    }
  }
  if ((source === '' || state.source === '') && state.editFor === null) {
    previewId = makeId();
  }
  return { ...state, source: action.payload.source, previewId, defaultInGame };
};

const handleToggleInGame = (state: ComposeState, action: ComposeAction<'toggleInGame'>): ComposeState => {
  const { inGame: modifier } = parseModifiers(state.source);
  if (action.payload.inGame != null) {
    // Do nothing if the payload is the same as the current state
    if (!modifier && state.defaultInGame === action.payload.inGame) {
      return state;
    }
    if (modifier !== false && modifier.inGame === action.payload.inGame) {
      return state;
    }
  }
  const { source } = state;
  let nextSource = source;
  if (!modifier) {
    const startsWithSpace = source.startsWith(' ');
    const command = state.defaultInGame ? '.out' : '.in';
    nextSource = (startsWithSpace ? command : `${command} `) + source;
  } else {
    const before = source.substring(0, modifier.start);
    const after = source.substring(modifier.start + modifier.len);
    nextSource = (modifier.inGame ? '.out ' : '.in ') + (before + after).trimStart();
  }
  return { ...state, source: nextSource, range: [nextSource.length, nextSource.length] };
};

const handleRecoverState = (state: ComposeState, action: ComposeAction<'recoverState'>): ComposeState => {
  return { ...action.payload, previewId: makeId(), media: null };
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

const handleSetInputedName = (state: ComposeState, { payload }: ComposeAction<'setInputedName'>): ComposeState => {
  const inputedName = payload.inputedName.trim().slice(0, 32);
  const nextState = { ...state, inputedName };
  if (payload.setInGame) {
    return handleToggleInGame(nextState, { type: 'toggleInGame', payload: { inGame: true } });
  } else {
    return nextState;
  }
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

const handleEditMessage = (
  state: ComposeState,
  { payload: { message } }: ComposeAction<'editMessage'>,
): ComposeState => {
  const { id: previewId, modified: editFor, text: source, inGame, name, mediaId } = message;

  const inputedName = inGame ? name : '';
  const range: ComposeState['range'] = [source.length, source.length];

  return {
    ...makeInitialComposeState(),
    previewId,
    editFor,
    media: mediaId,
    source,
    defaultInGame: inGame,
    inputedName,
    range,
    backup: clearBackup(state),
  };
};

const modifyModifier = (state: ComposeState, modifier: Modifier | false, command: string): ComposeState => {
  const { source } = state;
  let nextSource = source;
  if (!modifier) {
    const startsWithSpace = source.startsWith(' ');
    nextSource = (startsWithSpace ? command : `${command} `) + source;
  } else {
    const before = source.substring(0, modifier.start);
    const after = source.substring(modifier.start + modifier.len);
    nextSource = command + (before + after).trimStart();
  }
  return { ...state, source: nextSource, range: [nextSource.length, nextSource.length] };
};

const toggleModifier = (state: ComposeState, modifier: Modifier | false, command: string): ComposeState => {
  const { source } = state;
  let nextSource = source;
  if (!modifier) {
    const startsWithSpace = source.startsWith(' ');
    nextSource = (startsWithSpace ? command : `${command} `) + source;
  } else {
    const before = source.substring(0, modifier.start);
    const after = source.substring(modifier.start + modifier.len);
    nextSource = (before + after).trimStart();
  }
  return { ...state, source: nextSource, range: [nextSource.length, nextSource.length] };
};

const handleToggleBroadcast = (state: ComposeState, _: ComposeAction<'toggleBroadcast'>): ComposeState => {
  const { mute } = parseModifiers(state.source);
  return toggleModifier(state, mute, '.mute');
};

const handleToggleWhisper = (
  state: ComposeState,
  { payload: { username } }: ComposeAction<'toggleWhisper'>,
): ComposeState => {
  const { whisper } = parseModifiers(state.source);
  const command = username != null ? `.h(@${username})` : '.h';
  return toggleModifier(state, whisper, command);
};

const handleToggleAction = (state: ComposeState, _: ComposeAction<'toggleAction'>): ComposeState => {
  const { source } = state;
  const { action } = parseModifiers(source);
  return toggleModifier(state, action, '.me');
};

const handleSent = (state: ComposeState, _: ComposeAction<'sent'>): ComposeState => {
  const modifiersParseResult = parseModifiers(state.source);
  const nextDefaultInGame = !(modifiersParseResult.inGame ? modifiersParseResult.inGame.inGame : state.defaultInGame);
  let source = nextDefaultInGame ? '.out ' : '.in ';
  if (modifiersParseResult.mute) {
    source = '.mute ';
  }
  if (modifiersParseResult.action) {
    source = '.me ';
  }
  return {
    ...state,
    defaultInGame: nextDefaultInGame,
    previewId: makeId(),
    editFor: null,
    range: [source.length, source.length],
    media: null,
    source,
  };
};

const handleMedia = (state: ComposeState, { payload: { media } }: ComposeAction<'media'>): ComposeState => ({
  ...state,
  media,
});

const handleFocus = (state: ComposeState, _: ComposeAction<'focus'>): ComposeState => ({ ...state, focused: true });

const handleBlur = (state: ComposeState, _: ComposeAction<'blur'>): ComposeState => ({ ...state, focused: false });

const handleReset = (state: ComposeState, { payload: { restore } }: ComposeAction<'reset'>): ComposeState => {
  if (restore === false) {
    return makeInitialComposeState();
  }
  if (restore === true && state.backup != null) {
    return state.backup;
  }
  if (state.editFor != null && state.backup != null) {
    return state.backup;
  }
  return makeInitialComposeState();
};

const handleAddWhisperTarget = (
  state: ComposeState,
  { payload: { username } }: ComposeAction<'addWhisperTarget'>,
): ComposeState => {
  const { whisper } = parseModifiers(state.source);
  username = username.trim();
  if (username === '') {
    return state;
  }
  let mentionList = [username];
  if (whisper && !whisper.usernames.includes(username)) {
    mentionList = whisper.usernames.concat(username);
  }
  const mentions = mentionList.map((u) => `@${u}`).join(' ');
  const modifiedModifier = `.h(${mentions})`;

  return modifyModifier(state, whisper, modifiedModifier);
};

const handleRemoveWhisperTarget = (
  state: ComposeState,
  { payload: { username } }: ComposeAction<'removeWhisperTarget'>,
): ComposeState => {
  const { whisper } = parseModifiers(state.source);
  if (!whisper) {
    return state;
  }
  const mentions = whisper.usernames
    .filter((u) => u !== username)
    .map((u) => `@${u}`)
    .join(' ');
  const modifiedModifier = `.h(${mentions})`;

  return modifyModifier(state, whisper, modifiedModifier);
};

export const composeReducer = (state: ComposeState, action: ComposeActionUnion): ComposeState => {
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
    case 'editMessage':
      return handleEditMessage(state, action);
    case 'reset':
      return handleReset(state, action);
    case 'sent':
      return handleSent(state, action);
    case 'toggleAction':
      return handleToggleAction(state, action);
    case 'focus':
      return handleFocus(state, action);
    case 'media':
      return handleMedia(state, action);
    case 'blur':
      return handleBlur(state, action);
    case 'toggleWhisper':
      return handleToggleWhisper(state, action);
    case 'toggleBroadcast':
      return handleToggleBroadcast(state, action);
    case 'addWhisperTarget':
      return handleAddWhisperTarget(state, action);
    case 'removeWhisperTarget':
      return handleRemoveWhisperTarget(state, action);
  }
};

export const checkCompose =
  (characterName: string) =>
  ({
    source,
    inputedName,
    defaultInGame,
    media,
  }: Pick<ComposeState, 'source' | 'inputedName' | 'defaultInGame' | 'media'>): ComposeError | null => {
    const { inGame, rest } = parseModifiers(source);
    if (inGame ? inGame.inGame : defaultInGame) {
      if (inputedName.trim() === '' && characterName === '') {
        return 'NO_NAME';
      }
    }
    const mediaResult = validateMedia(media);
    if (mediaResult.isErr) {
      return mediaResult.err;
    }
    if (rest.trim() === '') {
      return 'TEXT_EMPTY';
    }
    return null;
  };
