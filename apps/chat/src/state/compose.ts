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

export const composeReducer = (state: ComposeState, action: ComposeActionUnion): ComposeState => {
  switch (action.type) {
    case 'setSource':
      return handleSetComposeSource(state, action);
    default:
      return state;
  }
};
