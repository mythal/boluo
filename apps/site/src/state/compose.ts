import { atomFamily, atomWithReducer } from 'jotai/utils';
import { makeId } from 'utils';
import { MakeAction, makeAction } from './actions';
import { getConnection } from './connection';
import { store } from './store';

export type ComposeActionMap = {
  setSource: { channelId: string; source: string };
};

export type ComposeActionUnion = MakeAction<ComposeActionMap, keyof ComposeActionMap>;
export type ComposeAction<T extends keyof ComposeActionMap> = MakeAction<ComposeActionMap, T>;

export const makeComposeAction = <A extends ComposeActionUnion>(type: A['type'], payload: A['payload']) => {
  return makeAction<ComposeActionMap, A, undefined>(type, payload, undefined);
};

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

export const composeReducer = (state: ComposeState, action: ComposeActionUnion): ComposeState => {
  switch (action.type) {
    case 'setSource':
      return handleSetComposeSource(state, action);
    default:
      return state;
  }
};

export const composeAtomFamily = atomFamily((channelId: string) => {
  const composeAtom = atomWithReducer(initialComposeState, composeReducer);
  store.sub(composeAtom, () => {
    const composeState = store.get(composeAtom);
    const connection = getConnection();
  });
  return composeAtom;
});
